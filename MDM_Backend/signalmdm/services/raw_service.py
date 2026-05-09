"""
signalmdm/services/raw_service.py
-----------------------------------
Service layer for FileUpload and RawRecord operations.

Immutability guarantee: this service only performs INSERT on raw_records.
No UPDATE or DELETE is allowed on that table.
"""

from __future__ import annotations

import os
import uuid
from typing import Any

from sqlalchemy.orm import Session

from signalmdm.models.file_upload import FileUpload
from signalmdm.models.raw_record  import RawRecord
from utils.checksum import generate_checksum, generate_file_checksum


class RawService:

    # ------------------------------------------------------------------
    # File metadata
    # ------------------------------------------------------------------

    def save_file_upload(
        self,
        db: Session,
        *,
        tenant_id: uuid.UUID,
        run_id: uuid.UUID,
        original_filename: str,
        stored_path: str,
        file_bytes: bytes,
        content_type: str = "application/octet-stream",
    ) -> FileUpload:
        """
        Persist file metadata after a successful disk write.

        The checksum is computed from the raw bytes.
        """
        checksum = generate_file_checksum(file_bytes)
        upload = FileUpload(
            file_id=uuid.uuid4(),
            tenant_id=tenant_id,
            run_id=run_id,
            original_filename=original_filename,
            stored_path=stored_path,
            file_size_bytes=len(file_bytes),
            content_type=content_type,
            checksum_md5=checksum,
        )
        db.add(upload)
        db.commit()
        db.refresh(upload)
        return upload

    # ------------------------------------------------------------------
    # Raw records
    # ------------------------------------------------------------------

    def bulk_insert_raw_records(
        self,
        db: Session,
        *,
        tenant_id: uuid.UUID,
        run_id: uuid.UUID,
        source_system_id: uuid.UUID,
        file_id: uuid.UUID | None,
        rows: list[dict[str, Any]],
    ) -> int:
        """
        Insert a batch of raw records from parsed file rows.

        Returns the number of records inserted.
        Commits in a single transaction for performance.
        """
        records = []
        for idx, row in enumerate(rows):
            checksum = generate_checksum(row)
            records.append(
                RawRecord(
                    raw_record_id=uuid.uuid4(),
                    tenant_id=tenant_id,
                    run_id=run_id,
                    file_id=file_id,
                    source_system_id=source_system_id,
                    row_index=idx,
                    raw_data=row,
                    checksum_md5=checksum,
                )
            )

        db.bulk_save_objects(records)
        db.commit()
        return len(records)

    # ------------------------------------------------------------------
    # Read
    # ------------------------------------------------------------------

    def get_raw_records_for_run(
        self,
        db: Session,
        run_id: uuid.UUID,
        tenant_id: uuid.UUID,
    ) -> list[RawRecord]:
        """Return all raw records for a given run (for staging worker)."""
        return (
            db.query(RawRecord)
            .filter(
                RawRecord.run_id == run_id,
                RawRecord.tenant_id == tenant_id,
            )
            .order_by(RawRecord.row_index)
            .all()
        )


# Singleton
raw_service = RawService()
