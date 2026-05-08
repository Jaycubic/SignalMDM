from fastapi import APIRouter, Query
from app.services.entity_service import (
    get_all_entities,
    get_entity_by_id,
    get_risk_history,
    get_drift_history,
    get_relationships
)

router = APIRouter()

@router.get("/entities")
def fetch_entities(
    domain: str = None,
    risk_gt: int = None,
    accelerating: bool = None
):
    return get_all_entities(domain, risk_gt, accelerating)


@router.get("/entities/{entity_id}")
def fetch_entity(entity_id: str):
    return get_entity_by_id(entity_id)


@router.get("/entities/{entity_id}/risk-history")
def fetch_risk_history(entity_id: str):
    return get_risk_history(entity_id)


@router.get("/entities/{entity_id}/drift-history")
def fetch_drift_history(entity_id: str):
    return get_drift_history(entity_id)


@router.get("/entities/{entity_id}/relationships")
def fetch_relationships(entity_id: str):
    return get_relationships(entity_id)