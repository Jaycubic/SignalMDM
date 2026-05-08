from fastapi import APIRouter, HTTPException
from datetime import datetime
import uuid

from app.utils.file_storage import read_json, write_json

router = APIRouter()

FILE_NAME = "match_rules.json"


# =====================================
# GET ALL RULES
# =====================================

@router.get("/match-rules")
def get_all_rules():
    return read_json(FILE_NAME)


# =====================================
# GET RULE BY ID
# =====================================

@router.get("/match-rules/{rule_id}")
def get_rule(rule_id: str):
    rules = read_json(FILE_NAME)

    for rule in rules:
        if rule["rule_id"] == rule_id:
            return rule

    raise HTTPException(status_code=404, detail="Rule not found")


# =====================================
# CREATE RULE
# =====================================

@router.post("/match-rules")
def create_rule(payload: dict):

    rules = read_json(FILE_NAME)

    rule_id = f"RULE-{uuid.uuid4().hex[:6].upper()}"

    new_rule = {
        "rule_id": rule_id,
        "domain": payload["domain"],
        "current_version": 1,
        "workflow_status": "DRAFT",
        "created_at": datetime.utcnow().isoformat(),
        "versions": [
            {
                "version": 1,
                "status": "DRAFT",
                "created_at": datetime.utcnow().isoformat(),
                "definition": payload
            }
        ]
    }

    rules.append(new_rule)
    write_json(FILE_NAME, rules)

    return new_rule


# =====================================
# UPDATE RULE (NEW VERSION)
# =====================================

@router.put("/match-rules/{rule_id}")
def update_rule(rule_id: str, payload: dict):

    rules = read_json(FILE_NAME)

    for rule in rules:

        if rule["rule_id"] == rule_id:

            new_version_number = rule["current_version"] + 1

            rule["versions"].append({
                "version": new_version_number,
                "status": "DRAFT",
                "created_at": datetime.utcnow().isoformat(),
                "definition": payload
            })

            rule["current_version"] = new_version_number
            rule["workflow_status"] = "DRAFT"

            write_json(FILE_NAME, rules)

            return {"message": "New version created", "version": new_version_number}

    raise HTTPException(status_code=404, detail="Rule not found")


# =====================================
# DELETE RULE
# =====================================

@router.delete("/match-rules/{rule_id}")
def delete_rule(rule_id: str):

    rules = read_json(FILE_NAME)

    updated_rules = [r for r in rules if r["rule_id"] != rule_id]

    if len(updated_rules) == len(rules):
        raise HTTPException(status_code=404, detail="Rule not found")

    write_json(FILE_NAME, updated_rules)

    return {"message": "Rule deleted"}