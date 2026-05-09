"""
signalmdm/services/ingestion_service.py
-----------------------------------------
Business logic for IngestionRun lifecycle management.

State machine enforced here:
    CREATED → RUNNING → RAW_LOADED → STAGING_CREATED → COMPLETED
    Any state → FAILED
"""

from __future__ import annotations

import uuid
from datetime import datetime, timezone
from typing import Optional

from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from signalmdm.models.ingestion_run  import IngestionRun
from signalmdm.models.source_system  import SourceSystem
from signalmdm.schemas.ingestion_schema import IngestionRunCreate
from signalmdm.enums import IngestionStateEnum, OperationTypeEnum
import signalmdm.services.audit_service as audit_svc


# Valid forward transitions in the state machine
_VALID_TRANSITIONS: dict[str, list[str]] = {
    IngestionStateEnum.CREATED:         [IngestionStateEnum.RUNNING],
    IngestionStateEnum.RUNNING:         [IngestionStateEnum.RAW_LOADED, IngestionStateEnum.FAILED],
    IngestionStateEnum.RAW_LOADED:      [IngestionStateEnum.STAGING_CREATED, IngestionStateEnum.FAILED],
    IngestionStateEnum.STAGING_CREATED: [IngestionStateEnum.COMPLETED, IngestionStateEnum.FAILED],
    IngestionStateEnum.COMPLETED:       [],
    IngestionStateEnum.FAILED:          [],
}


class IngestionService:

    # ------------------------------------------------------------------
    # Create
    # ------------------------------------------------------------------

    def create_run(
        self,
        db: Session,
        tenant_id: uuid.UUID,
        data: IngestionRunCreate,
        performed_by: str = "system",
    ) -> IngestionRun:
        """
        Create a new IngestionRun in CREATED state.

        Validates that the referenced SourceSystem belongs to this tenant.
        """
        source = (
            db.query(SourceSystem)
            .filter(
                SourceSystem.source_system_id == data.source_system_id,
                SourceSystem.tenant_id == tenant_id,
                SourceSystem.is_active.is_(True),
            )
            .first()
        )
        if not source:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Active source system {data.source_system_id} not found for this tenant.",
            )

        run = IngestionRun(
            run_id=uuid.uuid4(),
            tenant_id=tenant_id,
            source_system_id=data.source_system_id,
            state=IngestionStateEnum.CREATED,
            triggered_by=data.triggered_by,
        )
        db.add(run)
        db.flush()

        audit_svc.log_action(
            db,
            tenant_id=tenant_id,
            entity_name="ingestion_runs",
            entity_id=run.run_id,
            operation_type=OperationTypeEnum.INSERT,
            new_value={"state": run.state, "source_system_id": str(run.source_system_id)},
            performed_by=performed_by,
            autocommit=False,
        )

        db.commit()
        db.refresh(run)
        return run

    # ------------------------------------------------------------------
    # Read
    # ------------------------------------------------------------------

    def get_run(
        self,
        db: Session,
        tenant_id: uuid.UUID,
        run_id: uuid.UUID,
    ) -> IngestionRun:
        """Fetch a run; raise 404 if not found for this tenant."""
        run = (
            db.query(IngestionRun)
            .filter(
                IngestionRun.run_id == run_id,
                IngestionRun.tenant_id == tenant_id,
            )
            .first()
        )
        if not run:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Ingestion run {run_id} not found.",
            )
        return run

    # ------------------------------------------------------------------
    # State transition
    # ------------------------------------------------------------------

    def transition_state(
        self,
        db: Session,
        run_id: uuid.UUID,
        tenant_id: uuid.UUID,
        new_state: str,
        error_message: Optional[str] = None,
        performed_by: str = "system",
        record_count: Optional[int] = None,
        file_count: Optional[int] = None,
    ) -> IngestionRun:
        """
        Advance the run to `new_state`, enforcing the state machine.

        Raises 400 if the transition is invalid.
        """
        run = self.get_run(db, tenant_id, run_id)
        allowed = _VALID_TRANSITIONS.get(run.state, [])

        if new_state not in allowed:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=(
                    f"Cannot transition from {run.state!r} to {new_state!r}. "
                    f"Allowed: {allowed}"
                ),
            )

        old_state = run.state
        run.state = new_state

        if new_state == IngestionStateEnum.RUNNING:
            run.started_at = datetime.now(timezone.utc)
        if new_state in (IngestionStateEnum.COMPLETED, IngestionStateEnum.FAILED):
            run.completed_at = datetime.now(timezone.utc)
        if error_message is not None:
            run.error_message = error_message
        if record_count is not None:
            run.record_count = record_count
        if file_count is not None:
            run.file_count = file_count

        db.flush()

        audit_svc.log_action(
            db,
            tenant_id=tenant_id,
            entity_name="ingestion_runs",
            entity_id=run.run_id,
            operation_type=OperationTypeEnum.UPDATE,
            old_value={"state": old_state},
            new_value={"state": new_state},
            performed_by=performed_by,
            autocommit=False,
        )

        db.commit()
        db.refresh(run)
        return run


# Singleton
ingestion_service = IngestionService()
