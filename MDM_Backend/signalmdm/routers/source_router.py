"""
signalmdm/routers/source_router.py
------------------------------------
API endpoints for SourceSystem management.

Security:
  All endpoints require a valid encrypted JWT (via require_auth).
  tenant_id is extracted from the verified JWT — NOT a raw header.
  DELETE is restricted to admin role.
"""

from __future__ import annotations

import uuid

from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session

from signalmdm.database import get_db
from signalmdm.schemas.source_schema import SourceSystemCreate, SourceSystemRead
from signalmdm.schemas.common import ok
from signalmdm.services.source_service import source_service
from signalmdm.middleware.auth import TokenPayload, require_auth, require_admin

router = APIRouter(prefix="/sources", tags=["Source Systems"])


@router.post(
    "/register",
    summary="Register a new source system",
    status_code=status.HTTP_201_CREATED,
)
def register_source(
    body: SourceSystemCreate,
    db: Session = Depends(get_db),
    auth: TokenPayload = Depends(require_auth),
):
    """
    Register a new data source for the authenticated tenant.

    - `source_code` must be unique (lowercase slug, e.g. `salesforce_crm`).
    - `source_type` and `connection_type` use predefined enums.
    - `config_json` stores non-sensitive connection parameters.
    - `tenant_id` comes from the verified JWT — not an open header.
    """
    source = source_service.create_source(
        db,
        tenant_id=auth.tenant_id,
        data=body,
        performed_by=auth.user_id,
    )
    return ok(
        data=SourceSystemRead.model_validate(source).model_dump(),
        message="Source system registered successfully.",
    )


@router.get(
    "/",
    summary="List all source systems for the authenticated tenant",
)
def list_sources(
    skip: int = 0,
    limit: int = 50,
    db: Session = Depends(get_db),
    auth: TokenPayload = Depends(require_auth),
):
    """Return all active source systems scoped to the authenticated tenant."""
    sources = source_service.list_sources(db, tenant_id=auth.tenant_id, skip=skip, limit=limit)
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
    auth: TokenPayload = Depends(require_auth),
):
    """Fetch a single source system scoped to the authenticated tenant."""
    source = source_service.get_source(db, tenant_id=auth.tenant_id, source_system_id=source_id)
    return ok(data=SourceSystemRead.model_validate(source).model_dump())


@router.delete(
    "/{source_id}",
    summary="Deactivate a source system (admin only)",
)
def deactivate_source(
    source_id: uuid.UUID,
    db: Session = Depends(get_db),
    auth: TokenPayload = Depends(require_admin),   # admin only
):
    """Soft-deactivate (is_active=False). Restricted to admin role."""
    source = source_service.deactivate_source(
        db,
        tenant_id=auth.tenant_id,
        source_system_id=source_id,
        performed_by=auth.user_id,
    )
    return ok(
        data=SourceSystemRead.model_validate(source).model_dump(),
        message="Source system deactivated.",
    )
