"""
signalmdm/services/staging_service.py
----------------------------------------
Service layer for StagingEntity creation.

Phase 1 behaviour:
  • Read all RawRecords for a given run.
  • Create one StagingEntity per RawRecord (1-to-1 lineage).
  • entity_data = raw_data (verbatim copy — no transformation in Phase 1).
  • state = READY_FOR_MAPPING.
"""

from __future__ import annotations

import uuid

from sqlalchemy.orm import Session

from signalmdm.models.raw_record     import RawRecord
from signalmdm.models.staging_entity import StagingEntity
from signalmdm.enums import StagingStateEnum


class StagingService:

    def create_staging_from_run(
        self,
        db: Session,
        *,
        run_id: uuid.UUID,
        tenant_id: uuid.UUID,
        source_system_id: uuid.UUID,
    ) -> int:
        """
        Read all RawRecords for `run_id` and create corresponding StagingEntities.

        Returns the number of staging records created.

        Design note:
            We do NOT load all raw_records into Python memory at once for large
            datasets — we process in chunks of 500.
        """
        chunk_size = 500
        offset = 0
        total_created = 0

        while True:
            raw_batch: list[RawRecord] = (
                db.query(RawRecord)
                .filter(
                    RawRecord.run_id == run_id,
                    RawRecord.tenant_id == tenant_id,
                )
                .order_by(RawRecord.row_index)
                .offset(offset)
                .limit(chunk_size)
                .all()
            )

            if not raw_batch:
                break

            staging_batch = [
                StagingEntity(
                    staging_id=uuid.uuid4(),
                    tenant_id=tenant_id,
                    run_id=run_id,
                    raw_record_id=raw.raw_record_id,
                    source_system_id=source_system_id,
                    entity_data=raw.raw_data,  # verbatim copy in Phase 1
                    state=StagingStateEnum.READY_FOR_MAPPING,
                )
                for raw in raw_batch
            ]

            db.bulk_save_objects(staging_batch)
            db.commit()

            total_created += len(staging_batch)
            offset += chunk_size

        return total_created

    def count_staging_for_run(
        self,
        db: Session,
        run_id: uuid.UUID,
        tenant_id: uuid.UUID,
    ) -> int:
        """Return the number of staging entities created for this run."""
        return (
            db.query(StagingEntity)
            .filter(
                StagingEntity.run_id == run_id,
                StagingEntity.tenant_id == tenant_id,
            )
            .count()
        )


# Singleton
staging_service = StagingService()
