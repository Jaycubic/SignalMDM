from fastapi import APIRouter, HTTPException
from datetime import datetime
import uuid

from app.utils.file_storage import read_json, write_json

router = APIRouter()

@router.post("/merge")
def merge_records(payload: dict):

    if "golden_record" not in payload or "source_records" not in payload:
        raise HTTPException(status_code=400, detail="Invalid merge payload")

    golden_records = read_json("golden_records.json")
    merge_audit = read_json("merge_audit.json")
    entities = read_json("entities.json")

    golden_id = f"GOLD-{uuid.uuid4().hex[:8]}"
    merge_id = f"MERGE-{uuid.uuid4().hex[:8]}"

    golden_record = {
        "entity_id": golden_id,
        "data": payload["golden_record"],
        "merged_from": payload["source_records"],
        "created_at": datetime.utcnow().isoformat(),
        "created_by": "admin"
    }

    golden_records.append(golden_record)

    audit_entry = {
        "merge_id": merge_id,
        "golden_id": golden_id,
        "source_records": payload["source_records"],
        "field_decisions": payload.get("field_decisions", {}),
        "rule_id": payload.get("rule_id"),
        "timestamp": datetime.utcnow().isoformat()
    }

    merge_audit.append(audit_entry)

    for ent in entities:
        if ent.get("entity_id") in payload["source_records"]:
            ent["status"] = "MERGED"
            ent["merged_into"] = golden_id

    write_json("golden_records.json", golden_records)
    write_json("merge_audit.json", merge_audit)
    write_json("entities.json", entities)

    return {
        "success": True,
        "golden_id": golden_id,
        "merge_id": merge_id
    }


@router.get("/merge/history")
def get_merge_history():
    merge_audit = read_json("merge_audit.json")
    return {
        "count": len(merge_audit),
        "data": merge_audit
    }


@router.get("/merge/golden-records")
def get_golden_records():
    golden_records = read_json("golden_records.json")
    return {
        "count": len(golden_records),
        "data": golden_records
    }