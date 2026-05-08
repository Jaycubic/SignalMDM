from app.services.entity_service import entities

def simulate_entity_risk(entity_id, risk_adjustment):
    for e in entities:
        if e["entity_id"] == entity_id:
            new_risk = min(100, e["risk_score"] + risk_adjustment)
            return {
                "entity_id": entity_id,
                "new_risk_score": new_risk
            }

    return {"error": "Entity not found"}