"""
signalmdm/routers/tenant_router.py
------------------------------------
Tenant management endpoints.

Security:
  POST /tenants/  — public (no auth) — platform bootstrap only.
  GET  /tenants/  — admin only (lists all tenants — privileged).
  GET  /tenants/{id} — any authenticated user.
"""

from __future__ import annotations

import uuid

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from signalmdm.database import get_db
from signalmdm.models.tenant import Tenant
from signalmdm.schemas.ingestion_schema import TenantCreate, TenantRead
from signalmdm.schemas.common import ok
from signalmdm.enums import StatusEnum
from signalmdm.middleware.auth import TokenPayload, require_auth, require_admin

router = APIRouter(prefix="/tenants", tags=["Tenants"])


@router.post(
    "/",
    summary="Create a new tenant (public bootstrap — no auth required)",
    status_code=status.HTTP_201_CREATED,
)
def create_tenant(
    body: TenantCreate,
    db: Session = Depends(get_db),
):
    """
    Bootstrap a new tenant.
    This endpoint is intentionally public — it is only used during initial
    platform setup. In production, restrict this with a platform-level API key.
    """
    existing = db.query(Tenant).filter(Tenant.tenant_code == body.tenant_code).first()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"Tenant with code '{body.tenant_code}' already exists.",
        )
    tenant = Tenant(
        tenant_id=uuid.uuid4(),
        tenant_name=body.tenant_name,
        tenant_code=body.tenant_code,
        status=StatusEnum.ACTIVE,
    )
    db.add(tenant)
    db.commit()
    db.refresh(tenant)
    return ok(
        data=TenantRead.model_validate(tenant).model_dump(),
        message="Tenant created successfully.",
    )


@router.get(
    "/",
    summary="List all tenants (admin only)",
)
def list_tenants(
    db: Session = Depends(get_db),
    auth: TokenPayload = Depends(require_admin),   # admin only
):
    """Return all tenants — admin-only platform endpoint."""
    tenants = db.query(Tenant).order_by(Tenant.created_at.desc()).all()
    return ok(
        data=[TenantRead.model_validate(t).model_dump() for t in tenants],
        message=f"{len(tenants)} tenant(s) found.",
    )


@router.get(
    "/{tenant_id}",
    summary="Get a tenant by ID",
)
def get_tenant(
    tenant_id: uuid.UUID,
    db: Session = Depends(get_db),
    auth: TokenPayload = Depends(require_auth),
):
    """Any authenticated user can retrieve a tenant record."""
    tenant = db.query(Tenant).filter(Tenant.tenant_id == tenant_id).first()
    if not tenant:
        raise HTTPException(status_code=404, detail="Tenant not found.")
    return ok(data=TenantRead.model_validate(tenant).model_dump())
