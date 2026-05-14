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
from typing import Optional, Union

from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from signalmdm.models.source_system import SourceSystem
from signalmdm.schemas.source_schema import SourceSystemCreate
from signalmdm.enums import OperationTypeEnum, StatusEnum
import signalmdm.services.audit_service as audit_svc


class SourceService:
    # ------------------------------------------------------------------
    # Helper
    # ------------------------------------------------------------------
    def _parse_tenant(self, tenant_id: Union[str, uuid.UUID]) -> Optional[uuid.UUID]:
        """Convert string/uuid to UUID object. Returns None if 'platform'."""
        if tenant_id == "platform":
            return None
        if isinstance(tenant_id, uuid.UUID):
            return tenant_id
        try:
            return uuid.UUID(tenant_id)
        except (ValueError, TypeError):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Invalid tenant_id format: {tenant_id}",
            )

    # ------------------------------------------------------------------
    # Create
    # ------------------------------------------------------------------

    def create_source(
        self,
        db: Session,
        tenant_id: Union[str, uuid.UUID],
        data: SourceSystemCreate,
        performed_by: str = "system",
    ) -> SourceSystem:
        """
        Register a new source system.

        Raises 409 if `source_code` already exists for this tenant.
        """
        target_uuid = self._parse_tenant(tenant_id)
        if target_uuid is None:
            # SuperAdmin must specify which tenant they are creating for?
            # For now, we'll assume platform-level sources are allowed if needed,
            # but usually they belong to a real tenant.
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="SuperAdmin must provide a specific tenant_id for registration.",
            )

        existing = (
            db.query(SourceSystem)
            .filter(
                SourceSystem.tenant_id == target_uuid,
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
            tenant_id=target_uuid,
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
            tenant_id=target_uuid,
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
        tenant_id: Union[str, uuid.UUID],
        skip: int = 0,
        limit: int = 100,
    ) -> list[SourceSystem]:
        """Return all active source systems for the tenant (or all if platform)."""
        target_uuid = self._parse_tenant(tenant_id)

        query = db.query(SourceSystem)

        if target_uuid:
            query = query.filter(SourceSystem.tenant_id == target_uuid)

        return (
            query.order_by(SourceSystem.created_at.desc())
            .offset(skip)
            .limit(limit)
            .all()
        )

    def get_source(
        self,
        db: Session,
        tenant_id: Union[str, uuid.UUID],
        source_system_id: uuid.UUID,
    ) -> SourceSystem:
        """Fetch a single source system; raise 404 if not found."""
        target_uuid = self._parse_tenant(tenant_id)

        query = db.query(SourceSystem).filter(SourceSystem.source_system_id == source_system_id)

        if target_uuid:
            query = query.filter(SourceSystem.tenant_id == target_uuid)

        source = query.first()
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
        tenant_id: Union[str, uuid.UUID],
        source_system_id: uuid.UUID,
        performed_by: str = "system",
    ) -> SourceSystem:
        """Soft-deactivate a source system (is_active = False)."""
        source = self.get_source(db, tenant_id, source_system_id)
        target_uuid = self._parse_tenant(tenant_id) or source.tenant_id

        old_val = {"is_active": source.is_active, "status": source.status}
        source.is_active = False
        source.status = StatusEnum.DEACTIVATED.value  # Explicitly use .value string
        db.flush()

        audit_svc.log_action(
            db,
            tenant_id=target_uuid,
            entity_name="source_systems",
            entity_id=source.source_system_id,
            operation_type=OperationTypeEnum.UPDATE,
            old_value=old_val,
            new_value={"is_active": False, "status": "DEACTIVATED"},
            performed_by=performed_by,
            autocommit=False,
        )

        db.commit()
        db.refresh(source)
        return source


    # ------------------------------------------------------------------
    # Update Status
    # ------------------------------------------------------------------

    def update_source_status(
        self,
        db: Session,
        tenant_id: Union[str, uuid.UUID],
        source_system_id: uuid.UUID,
        new_status: StatusEnum,
        performed_by: str = "system",
    ) -> SourceSystem:
        """Update the status of a source system (ACTIVE, SUSPENDED, ARCHIVED, etc)."""
        source = self.get_source(db, tenant_id, source_system_id)
        target_uuid = self._parse_tenant(tenant_id) or source.tenant_id

        old_val = {"status": source.status, "is_active": source.is_active}
        
        # If moving to DEACTIVATED, also set is_active=False
        # If moving to ACTIVE, ensure is_active=True
        if new_status == StatusEnum.DEACTIVATED:
            source.is_active = False
        elif new_status == StatusEnum.ACTIVE:
            source.is_active = True
            
        source.status = new_status.value
        db.flush()

        audit_svc.log_action(
            db,
            tenant_id=target_uuid,
            entity_name="source_systems",
            entity_id=source.source_system_id,
            operation_type=OperationTypeEnum.UPDATE,
            old_value=old_val,
            new_value={"status": source.status, "is_active": source.is_active},
            performed_by=performed_by,
            autocommit=False,
        )

        db.commit()
        db.refresh(source)
        return source


# Singleton
source_service = SourceService()
