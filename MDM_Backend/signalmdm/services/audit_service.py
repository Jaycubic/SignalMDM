"""
signalmdm/services/audit_service.py
-------------------------------------
Service for inserting records into the immutable audit_log table.

RULES:
  • Only INSERT — never UPDATE or DELETE audit rows.
  • Caller provides `performed_by`; defaults to "system" for worker jobs.
  • `old_value` / `new_value` must be plain dicts (or None).
"""

from __future__ import annotations

import uuid
from typing import Any, Optional, Union

from sqlalchemy import String, cast, or_
from sqlalchemy.orm import Session

from signalmdm.models.audit import AuditLog
from signalmdm.models.tenant import Tenant
from signalmdm.enums import OperationTypeEnum


def log_action(
    db: Session,
    *,
    tenant_id: Optional[uuid.UUID],
    entity_name: str,
    entity_id: Optional[uuid.UUID] = None,
    operation_type: str = OperationTypeEnum.INSERT,
    old_value: Optional[dict[str, Any]] = None,
    new_value: Optional[dict[str, Any]] = None,
    performed_by: str = "system",
    source_ip: Optional[str] = None,
    trace_id: Optional[str] = None,
    autocommit: bool = True,
) -> AuditLog:
    """
    Insert a single audit log entry.

    Args:
        db:             Active SQLAlchemy session.
        tenant_id:      Tenant UUID.
        entity_name:    Name of the table / domain object changed.
        entity_id:      PK of the changed record (not a FK).
        operation_type: INSERT / UPDATE / DELETE / MERGE.
        old_value:      Row snapshot before the operation.
        new_value:      Row snapshot after the operation.
        performed_by:   Username or "system".
        source_ip:      Optional client IP.
        trace_id:       Optional distributed trace correlation ID.
        autocommit:     Flush + commit immediately (default True).
                        Set False when batching inside a transaction.

    Returns:
        The inserted AuditLog instance.
    """
    log = AuditLog(
        audit_id=uuid.uuid4(),
        tenant_id=tenant_id,
        entity_name=entity_name,
        entity_id=entity_id,
        operation_type=operation_type,
        old_value=old_value,
        new_value=new_value,
        performed_by=performed_by,
        source_ip=source_ip,
        trace_id=trace_id,
    )
    db.add(log)
    if autocommit:
        db.commit()
        db.refresh(log)
    return log


def _parse_tenant_id(tenant_id: Union[str, uuid.UUID]) -> Optional[uuid.UUID]:
    if tenant_id == "platform":
        return None
    if isinstance(tenant_id, uuid.UUID):
        return tenant_id
    return uuid.UUID(str(tenant_id))


def list_api_logs_page(
    db: Session,
    *,
    tenant_id: Union[str, uuid.UUID],
    skip: int = 0,
    limit: int = 100,
    operation_type: Optional[str] = None,
    entity_name: Optional[str] = None,
    search: Optional[str] = None,
) -> tuple[list[dict[str, Any]], int]:
    """
    Paginated audit_log rows for the API Logs admin screen (newest first).
    """
    tid = _parse_tenant_id(tenant_id)
    q = db.query(AuditLog, Tenant.tenant_name).outerjoin(
        Tenant, Tenant.tenant_id == AuditLog.tenant_id
    )
    if tid is not None:
        q = q.filter(AuditLog.tenant_id == tid)
    if operation_type and operation_type.strip():
        q = q.filter(AuditLog.operation_type == operation_type.strip())
    if entity_name and entity_name.strip():
        q = q.filter(AuditLog.entity_name == entity_name.strip())
    if search and search.strip():
        term = f"%{search.strip()}%"
        q = q.filter(
            or_(
                cast(AuditLog.audit_id, String).ilike(term),
                cast(AuditLog.entity_id, String).ilike(term),
                AuditLog.entity_name.ilike(term),
                AuditLog.operation_type.ilike(term),
                AuditLog.performed_by.ilike(term),
                AuditLog.source_ip.ilike(term),
                AuditLog.trace_id.ilike(term),
                cast(AuditLog.old_value, String).ilike(term),
                cast(AuditLog.new_value, String).ilike(term),
            )
        )

    total = q.count()
    rows = (
        q.order_by(AuditLog.performed_at.desc())
        .offset(skip)
        .limit(limit)
        .all()
    )
    out: list[dict[str, Any]] = []
    for log, tenant_name in rows:
        out.append(
            {
                "audit_id": log.audit_id,
                "tenant_id": log.tenant_id,
                "tenant_name": tenant_name,
                "entity_name": log.entity_name,
                "entity_id": log.entity_id,
                "operation_type": log.operation_type,
                "old_value": log.old_value,
                "new_value": log.new_value,
                "performed_by": log.performed_by,
                "performed_at": log.performed_at,
                "source_ip": log.source_ip,
                "trace_id": log.trace_id,
            }
        )
    return out, total
