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
from typing import Any, Optional

from sqlalchemy.orm import Session

from signalmdm.models.audit import AuditLog
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
