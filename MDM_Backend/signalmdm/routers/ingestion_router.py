"""
signalmdm/routers/ingestion_router.py
---------------------------------------
API endpoints for the ingestion pipeline.

Flow:
  1. POST /ingestion/start              → create IngestionRun (CREATED)
  2. POST /ingestion/{run_id}/upload    → upload file → trigger async raw worker
  3. GET  /ingestion/{run_id}/status    → poll state + counts

Multi-tenancy: all endpoints require X-Tenant-ID header.
"""

from __future__ import annotations

import io
import json
import os
import uuid
import csv

from fastapi import APIRouter, Depends, Header, HTTPException, UploadFile, File, status
from sqlalchemy.orm import Session

from signalmdm.database import get_db
from signalmdm.schemas.ingestion_schema import (
    IngestionRunCreate,
    IngestionRunRead,
    IngestionStatusRead,
)
from signalmdm.schemas.common import ok
from signalmdm.services.ingestion_service import ingestion_service
from signalmdm.services.raw_service import raw_service
from signalmdm.services.staging_service import staging_service
from signalmdm.enums import IngestionStateEnum
from core.config import settings

router = APIRouter(prefix="/ingestion", tags=["Ingestion"])

# Supported MIME types / extensions
_ALLOWED_TYPES = {"text/csv", "application/json", "application/octet-stream"}
_MAX_FILE_MB = 50


def _resolve_tenant(x_tenant_id: str = Header(..., alias="X-Tenant-ID")) -> uuid.UUID:
    try:
        return uuid.UUID(x_tenant_id)
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="X-Tenant-ID must be a valid UUID.",
        )


# ---------------------------------------------------------------------------
# 1. Start ingestion run
# ---------------------------------------------------------------------------

@router.post(
    "/start",
    summary="Create a new ingestion run",
    status_code=status.HTTP_201_CREATED,
)
def start_ingestion(
    body: IngestionRunCreate,
    db: Session = Depends(get_db),
    tenant_id: uuid.UUID = Depends(_resolve_tenant),
):
    """
    Create a new IngestionRun in **CREATED** state.

    Returns the `run_id` UUID — use it for subsequent upload and status calls.
    """
    run = ingestion_service.create_run(db, tenant_id=tenant_id, data=body)
    return ok(
        data=IngestionRunRead.model_validate(run).model_dump(),
        message="Ingestion run created. Use the run_id to upload files.",
    )


# ---------------------------------------------------------------------------
# 2. Upload file and trigger async processing
# ---------------------------------------------------------------------------

@router.post(
    "/{run_id}/upload",
    summary="Upload a CSV or JSON file for an ingestion run",
)
def upload_file(
    run_id: uuid.UUID,
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    tenant_id: uuid.UUID = Depends(_resolve_tenant),
):
    """
    Upload a data file (CSV or JSON) to an existing ingestion run.

    **Triggers the async raw-processing worker** which will:
    1. Parse the file rows
    2. Insert raw_records with checksums
    3. Transition run → RAW_LOADED
    4. Chain staging worker → STAGING_CREATED → COMPLETED
    """
    # Verify run exists and is in an acceptable state
    run = ingestion_service.get_run(db, tenant_id=tenant_id, run_id=run_id)
    if run.state not in (IngestionStateEnum.CREATED, IngestionStateEnum.RUNNING):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Cannot upload to a run in state '{run.state}'.",
        )

    # Read file bytes
    file_bytes = file.file.read()
    file_size_mb = len(file_bytes) / (1024 * 1024)
    if file_size_mb > _MAX_FILE_MB:
        raise HTTPException(
            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            detail=f"File exceeds {_MAX_FILE_MB} MB limit.",
        )

    # Ensure storage directory exists
    upload_dir = os.path.join(os.getcwd(), settings.upload_dir, str(run_id))
    os.makedirs(upload_dir, exist_ok=True)

    # Save file to disk
    safe_filename = f"{uuid.uuid4()}_{file.filename}"
    stored_path = os.path.join(upload_dir, safe_filename)
    with open(stored_path, "wb") as f:
        f.write(file_bytes)

    # Persist file metadata
    file_upload = raw_service.save_file_upload(
        db,
        tenant_id=tenant_id,
        run_id=run_id,
        original_filename=file.filename or "upload",
        stored_path=stored_path,
        file_bytes=file_bytes,
        content_type=file.content_type or "application/octet-stream",
    )

    # Transition run → RUNNING and increment file count
    ingestion_service.transition_state(
        db,
        run_id=run_id,
        tenant_id=tenant_id,
        new_state=IngestionStateEnum.RUNNING,
        file_count=run.file_count + 1,
    )

    # Trigger async Celery worker
    try:
        from signalmdm.workers.raw_worker import process_raw_upload
        process_raw_upload.delay(
            str(run_id),
            str(file_upload.file_id),
            str(tenant_id),
        )
        async_triggered = True
    except Exception as celery_err:
        # If Celery/Redis is unavailable, fall back to synchronous processing
        async_triggered = False
        _process_synchronously(db, run_id, file_upload.file_id, tenant_id, file_bytes, file.filename or "upload")

    return ok(
        data={
            "run_id": str(run_id),
            "file_id": str(file_upload.file_id),
            "filename": file.filename,
            "size_bytes": len(file_bytes),
            "async_processing": async_triggered,
        },
        message="File uploaded. Processing started." if async_triggered else "File uploaded. Processed synchronously (Celery unavailable).",
    )


def _process_synchronously(
    db: Session,
    run_id: uuid.UUID,
    file_id: uuid.UUID,
    tenant_id: uuid.UUID,
    file_bytes: bytes,
    filename: str,
) -> None:
    """
    Synchronous fallback when Celery is not available.
    Parses the file, inserts raw records, then creates staging entities.
    """
    from signalmdm.models.ingestion_run import IngestionRun
    run = db.query(IngestionRun).filter(IngestionRun.run_id == run_id).first()
    if not run:
        return

    rows = _parse_file(file_bytes, filename)

    record_count = raw_service.bulk_insert_raw_records(
        db,
        tenant_id=tenant_id,
        run_id=run_id,
        source_system_id=run.source_system_id,
        file_id=file_id,
        rows=rows,
    )

    ingestion_service.transition_state(
        db, run_id=run_id, tenant_id=tenant_id,
        new_state=IngestionStateEnum.RAW_LOADED,
        record_count=record_count,
    )

    staging_count = staging_service.create_staging_from_run(
        db,
        run_id=run_id,
        tenant_id=tenant_id,
        source_system_id=run.source_system_id,
    )

    ingestion_service.transition_state(
        db, run_id=run_id, tenant_id=tenant_id,
        new_state=IngestionStateEnum.STAGING_CREATED,
    )

    ingestion_service.transition_state(
        db, run_id=run_id, tenant_id=tenant_id,
        new_state=IngestionStateEnum.COMPLETED,
    )


def _parse_file(file_bytes: bytes, filename: str) -> list[dict]:
    """Parse CSV or JSON bytes into a list of row dicts."""
    name_lower = filename.lower()
    if name_lower.endswith(".json"):
        data = json.loads(file_bytes.decode("utf-8"))
        return data if isinstance(data, list) else [data]
    else:
        # Default: treat as CSV
        text = file_bytes.decode("utf-8")
        reader = csv.DictReader(io.StringIO(text))
        return [dict(row) for row in reader]


# ---------------------------------------------------------------------------
# 3. Status endpoint
# ---------------------------------------------------------------------------

@router.get(
    "/{run_id}/status",
    summary="Get the status of an ingestion run",
)
def get_status(
    run_id: uuid.UUID,
    db: Session = Depends(get_db),
    tenant_id: uuid.UUID = Depends(_resolve_tenant),
):
    """
    Poll the current state of an ingestion run.

    Returns state, file_count, record_count, and staging_count.
    """
    run = ingestion_service.get_run(db, tenant_id=tenant_id, run_id=run_id)
    staging_count = staging_service.count_staging_for_run(db, run_id=run_id, tenant_id=tenant_id)

    return ok(
        data=IngestionStatusRead(
            run_id=run.run_id,
            state=run.state,
            file_count=run.file_count,
            record_count=run.record_count,
            staging_count=staging_count,
            error_message=run.error_message,
            started_at=run.started_at,
            completed_at=run.completed_at,
        ).model_dump(),
        message=f"Run is {run.state}.",
    )


@router.get(
    "/",
    summary="List all ingestion runs for a tenant",
)
def list_runs(
    skip: int = 0,
    limit: int = 20,
    db: Session = Depends(get_db),
    tenant_id: uuid.UUID = Depends(_resolve_tenant),
):
    """List recent ingestion runs for the tenant, newest first."""
    from signalmdm.models.ingestion_run import IngestionRun
    runs = (
        db.query(IngestionRun)
        .filter(IngestionRun.tenant_id == tenant_id)
        .order_by(IngestionRun.created_at.desc())
        .offset(skip)
        .limit(limit)
        .all()
    )
    return ok(
        data=[IngestionRunRead.model_validate(r).model_dump() for r in runs],
        message=f"{len(runs)} run(s) found.",
    )
