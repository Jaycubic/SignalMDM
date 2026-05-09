"""
signalmdm/services/source_service.py
--------------------------------------
Business logic for SourceSystem CRUD.

Rules:
  • `source_code` must be unique per tenant.
  • Every create/update emits an audit log entry.
  • All queries MUST filter by `tenant_id`.
"""

from __future__ import annotations

import uuid
from typing import Optional

from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from signalmdm.models.source_system import SourceSystem
from signalmdm.schemas.source_schema import SourceSystemCreate
from signalmdm.enums import OperationTypeEnum
import signalmdm.services.audit_service as audit_svc


class SourceService:
    # ------------------------------------------------------------------
    # Create
    # ------------------------------------------------------------------

    def create_source(
        self,
        db: Session,
        tenant_id: uuid.UUID,
        data: SourceSystemCreate,
        performed_by: str = "system",
    ) -> SourceSystem:
        """
        Register a new source system.

        Raises 409 if `source_code` already exists for this tenant.
        """
        existing = (
            db.query(SourceSystem)
            .filter(
                SourceSystem.tenant_id == tenant_id,
                SourceSystem.source_code == data.source_code,
            )
            .first()
        )
        if existing:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=f"Source with code '{data.source_code}' already exists for this tenant.",
            )

        source = SourceSystem(
            source_system_id=uuid.uuid4(),
            tenant_id=tenant_id,
            source_name=data.source_name,
            source_code=data.source_code,
            source_type=data.source_type,
            connection_type=data.connection_type,
            config_json=data.config_json,
        )
        db.add(source)
        db.flush()  # Get PK before audit

        audit_svc.log_action(
            db,
            tenant_id=tenant_id,
            entity_name="source_systems",
            entity_id=source.source_system_id,
            operation_type=OperationTypeEnum.INSERT,
            new_value={
                "source_code": source.source_code,
                "source_type": source.source_type,
                "connection_type": source.connection_type,
            },
            performed_by=performed_by,
            autocommit=False,
        )

        db.commit()
        db.refresh(source)
        return source

    # ------------------------------------------------------------------
    # Read
    # ------------------------------------------------------------------

    def list_sources(
        self,
        db: Session,
        tenant_id: uuid.UUID,
        skip: int = 0,
        limit: int = 50,
    ) -> list[SourceSystem]:
        """Return all active source systems for the tenant."""
        return (
            db.query(SourceSystem)
            .filter(
                SourceSystem.tenant_id == tenant_id,
                SourceSystem.is_active.is_(True),
            )
            .order_by(SourceSystem.created_at.desc())
            .offset(skip)
            .limit(limit)
            .all()
        )

    def get_source(
        self,
        db: Session,
        tenant_id: uuid.UUID,
        source_system_id: uuid.UUID,
    ) -> SourceSystem:
        """Fetch a single source system; raise 404 if not found."""
        source = (
            db.query(SourceSystem)
            .filter(
                SourceSystem.tenant_id == tenant_id,
                SourceSystem.source_system_id == source_system_id,
            )
            .first()
        )
        if not source:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Source system {source_system_id} not found.",
            )
        return source

    # ------------------------------------------------------------------
    # Deactivate
    # ------------------------------------------------------------------

    def deactivate_source(
        self,
        db: Session,
        tenant_id: uuid.UUID,
        source_system_id: uuid.UUID,
        performed_by: str = "system",
    ) -> SourceSystem:
        """Soft-deactivate a source system (is_active = False)."""
        source = self.get_source(db, tenant_id, source_system_id)
        old_val = {"is_active": source.is_active}
        source.is_active = False
        db.flush()

        audit_svc.log_action(
            db,
            tenant_id=tenant_id,
            entity_name="source_systems",
            entity_id=source.source_system_id,
            operation_type=OperationTypeEnum.UPDATE,
            old_value=old_val,
            new_value={"is_active": False},
            performed_by=performed_by,
            autocommit=False,
        )

        db.commit()
        db.refresh(source)
        return source


# Singleton
source_service = SourceService()
