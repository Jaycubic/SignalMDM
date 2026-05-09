"""
signalmdm/schemas/ingestion_schema.py
---------------------------------------
Pydantic v2 schemas for IngestionRun and related request/response.
"""

from __future__ import annotations

import uuid
from datetime import datetime
from typing import Optional

from pydantic import BaseModel, Field

from signalmdm.enums import IngestionStateEnum


class IngestionRunCreate(BaseModel):
    """Request body for POST /ingestion/start."""

    source_system_id: uuid.UUID = Field(
        ...,
        description="UUID of the registered source system for this run.",
    )
    triggered_by: Optional[str] = Field(
        default=None,
        max_length=150,
        description="Username or system identifier initiating the run.",
    )

    model_config = {"from_attributes": True}


class IngestionRunRead(BaseModel):
    """Full ingestion run response."""

    run_id: uuid.UUID
    tenant_id: uuid.UUID
    source_system_id: uuid.UUID
    state: str
    triggered_by: Optional[str]
    file_count: int
    record_count: int
    error_message: Optional[str]
    started_at: Optional[datetime]
    completed_at: Optional[datetime]
    created_at: datetime

    model_config = {"from_attributes": True}


class IngestionStatusRead(BaseModel):
    """Lightweight status response for GET /ingestion/{run_id}/status."""

    run_id: uuid.UUID
    state: str
    file_count: int
    record_count: int
    staging_count: Optional[int] = None
    error_message: Optional[str] = None
    started_at: Optional[datetime]
    completed_at: Optional[datetime]

    model_config = {"from_attributes": True}


class TenantCreate(BaseModel):
    """Request body for POST /tenants/ (bootstrap endpoint)."""

    tenant_name: str = Field(..., min_length=1, max_length=255, example="Acme Corporation")
    tenant_code: str = Field(
        ...,
        min_length=1,
        max_length=100,
        pattern=r"^[a-z0-9_\-]+$",
        example="acme_corp",
        description="Unique slug for this tenant.",
    )

    model_config = {"from_attributes": True}


class TenantRead(BaseModel):
    """Response for a single Tenant."""

    tenant_id: uuid.UUID
    tenant_name: str
    tenant_code: str
    status: str
    created_at: datetime

    model_config = {"from_attributes": True}
