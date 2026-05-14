"""
signalmdm/schemas/raw_schema.py
---------------------------------
Pydantic schemas for Raw Landing (read-only list of raw_records).
"""

from __future__ import annotations

import uuid
from datetime import datetime
from typing import Any, Optional

from pydantic import BaseModel, Field


class RawRecordListItem(BaseModel):
    """One row for the Raw Landing UI."""

    raw_record_id: uuid.UUID
    tenant_id: uuid.UUID
    run_id: uuid.UUID
    source_system_id: uuid.UUID
    source_name: str = Field(description="Display name from source_systems.")
    ingestion_run_state: str
    row_index: Optional[int] = None
    raw_data: dict[str, Any]
    checksum_md5: str
    created_at: datetime
    processing_status: str = Field(
        description="PENDING | PROCESSING | COMPLETED | FAILED | DUPLICATE (UI)",
    )
    source_record_id: str = Field(
        description="Business key from payload (id / externalId) or row index fallback.",
    )
    entity_display: str = Field(
        default="RECORD",
        description="Hint from source supported_entities or staging mapped_entity_type.",
    )
    has_staging: bool = False
    mapped_entity_type: Optional[str] = None

    model_config = {"from_attributes": False}
