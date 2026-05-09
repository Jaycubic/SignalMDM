"""
signalmdm/routers/tenant_router.py
------------------------------------
Bootstrap endpoints for tenant management.

Multi-tenancy note:
  In production, tenant creation is privileged (platform admin only).
  For Phase 1 development, a simple POST is provided without auth so you
  can create a test tenant and get its tenant_id for subsequent calls.
"""

from __future__ import annotations

import uuid

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from signalmdm.database import get_db
from signalmdm.models.tenant import Tenant
from signalmdm.schemas.ingestion_schema import TenantCreate, TenantRead
from signalmdm.schemas.common import ok, err
from signalmdm.enums import StatusEnum

router = APIRouter(prefix="/tenants", tags=["Tenants"])


@router.post(
    "/",
    summary="Create a new tenant",
    status_code=status.HTTP_201_CREATED,
)
def create_tenant(
    body: TenantCreate,
    db: Session = Depends(get_db),
):
    """
    Bootstrap a new tenant.

    Returns the tenant record including the `tenant_id` UUID required
    for all subsequent API calls.
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
    summary="List all tenants",
)
def list_tenants(db: Session = Depends(get_db)):
    """Return all tenants (dev/admin endpoint)."""
    tenants = db.query(Tenant).order_by(Tenant.created_at.desc()).all()
    return ok(
        data=[TenantRead.model_validate(t).model_dump() for t in tenants],
        message=f"{len(tenants)} tenant(s) found.",
    )


@router.get(
    "/{tenant_id}",
    summary="Get a tenant by ID",
)
def get_tenant(tenant_id: uuid.UUID, db: Session = Depends(get_db)):
    tenant = db.query(Tenant).filter(Tenant.tenant_id == tenant_id).first()
    if not tenant:
        raise HTTPException(status_code=404, detail="Tenant not found.")
    return ok(data=TenantRead.model_validate(tenant).model_dump())
