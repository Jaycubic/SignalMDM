from fastapi import APIRouter
from app.services.simulation_service import simulate_entity_risk

router = APIRouter()

@router.post("/simulation/entity-risk")
def simulate(payload: dict):
    return simulate_entity_risk(
        payload["entity_id"],
        payload["risk_adjustment"]
    )