import json
from pathlib import Path

BASE_PATH = Path(__file__).resolve().parent.parent / "data"

def load_json(filename):
    with open(BASE_PATH / filename, "r") as f:
        return json.load(f)

entities = load_json("entities.json")
risk_history = load_json("risk_history.json")
drift_history = load_json("drift_history.json")
relationships = load_json("relationships.json")


def get_all_entities(domain=None, risk_gt=None, accelerating=None):
    result = entities

    if domain:
        result = [e for e in result if e["domain_type"] == domain]

    if risk_gt:
        result = [e for e in result if e["risk_score"] >= risk_gt]

    if accelerating:
        result = [e for e in result if e["drift_acceleration"] >= 2]

    return result


def get_entity_by_id(entity_id):
    for e in entities:
        if e["entity_id"] == entity_id:
            return e
    return {"error": "Entity not found"}


def get_risk_history(entity_id):
    return risk_history.get(entity_id, [])


def get_drift_history(entity_id):
    return drift_history.get(entity_id, [])


def get_relationships(entity_id):
    return relationships.get(entity_id, [])