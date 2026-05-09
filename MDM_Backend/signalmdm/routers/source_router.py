"""
signalmdm/routers/source_router.py
------------------------------------
API endpoints for SourceSystem management.

Multi-tenancy:
  Every request must include the `X-Tenant-ID` header.
  The header value is validated as a UUID and used to scope all DB queries.
"""

from __future__ import annotations

import uuid

from fastapi import APIRouter, Depends, Header, HTTPException, status
from sqlalchemy.orm import Session

from signalmdm.database import get_db
from signalmdm.schemas.source_schema import SourceSystemCreate, SourceSystemRead
from signalmdm.schemas.common import ok
from signalmdm.services.source_service import source_service

router = APIRouter(prefix="/sources", tags=["Source Systems"])


def _resolve_tenant(x_tenant_id: str = Header(..., alias="X-Tenant-ID")) -> uuid.UUID:
    """Extract and validate the tenant UUID from the X-Tenant-ID header."""
    try:
        return uuid.UUID(x_tenant_id)
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="X-Tenant-ID header must be a valid UUID.",
        )


@router.post(
    "/register",
    summary="Register a new source system",
    status_code=status.HTTP_201_CREATED,
)
def register_source(
    body: SourceSystemCreate,
    db: Session = Depends(get_db),
    tenant_id: uuid.UUID = Depends(_resolve_tenant),
):
    """
    Register a new data source for the tenant.

    - `source_code` must be unique (lowercase slug, e.g. `salesforce_crm`).
    - `source_type` and `connection_type` use predefined enums.
    - `config_json` stores non-sensitive connection parameters.
    """
    source = source_service.create_source(db, tenant_id=tenant_id, data=body)
    return ok(
        data=SourceSystemRead.model_validate(source).model_dump(),
        message="Source system registered successfully.",
    )


@router.get(
    "/",
    summary="List all source systems for a tenant",
)
def list_sources(
    skip: int = 0,
    limit: int = 50,
    db: Session = Depends(get_db),
    tenant_id: uuid.UUID = Depends(_resolve_tenant),
):
    """Return all active source systems scoped to the tenant."""
    sources = source_service.list_sources(db, tenant_id=tenant_id, skip=skip, limit=limit)
    return ok(
        data=[SourceSystemRead.model_validate(s).model_dump() for s in sources],
        message=f"{len(sources)} source system(s) found.",
    )


@router.get(
    "/{source_id}",
    summary="Get a source system by ID",
)
def get_source(
    source_id: uuid.UUID,
    db: Session = Depends(get_db),
    tenant_id: uuid.UUID = Depends(_resolve_tenant),
):
    """Fetch a single source system scoped to the tenant."""
    source = source_service.get_source(db, tenant_id=tenant_id, source_system_id=source_id)
    return ok(data=SourceSystemRead.model_validate(source).model_dump())


@router.delete(
    "/{source_id}",
    summary="Deactivate a source system",
)
def deactivate_source(
    source_id: uuid.UUID,
    db: Session = Depends(get_db),
    tenant_id: uuid.UUID = Depends(_resolve_tenant),
):
    """Soft-deactivate (set is_active=False). Does not delete the record."""
    source = source_service.deactivate_source(db, tenant_id=tenant_id, source_system_id=source_id)
    return ok(
        data=SourceSystemRead.model_validate(source).model_dump(),
        message="Source system deactivated.",
    )
