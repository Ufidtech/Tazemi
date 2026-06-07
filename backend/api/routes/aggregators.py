from fastapi import APIRouter, Depends, HTTPException

from backend.auth import audit_log, get_current_user
from backend.data.demo_data import DEMO_DATA
from backend.models import AggregatorCreate, AggregatorPatch
from backend.services.aggregator_service import create_aggregator, delete_aggregator, get_aggregator_by_id, list_aggregators, update_aggregator

router = APIRouter()


@router.get("")
def read_aggregators():
    return DEMO_DATA.get("aggregators", [])


@router.get("/{aggregator_id}")
def read_aggregator(aggregator_id: str):
    aggregator = next((item for item in DEMO_DATA.get("aggregators", []) if item.get("id") == aggregator_id), None)
    if not aggregator:
        raise HTTPException(status_code=404, detail="Aggregator not found")
    return aggregator


@router.post("")
def write_aggregator(payload: AggregatorCreate, user=Depends(get_current_user)):
    data = payload.model_dump()
    data["created_by"] = user.get("uid")
    record = create_aggregator(data)
    audit_log("aggregator.create", user, "aggregators", {"id": record["id"]})
    return record


@router.patch("/{aggregator_id}")
def edit_aggregator(aggregator_id: str, payload: AggregatorPatch, user=Depends(get_current_user)):
    updated = next((item for item in DEMO_DATA.get("aggregators", []) if item.get("id") == aggregator_id), None)
    if not updated:
        raise HTTPException(status_code=404, detail="Aggregator not found")
    updated = {**updated, **payload.model_dump(exclude_unset=True), "id": aggregator_id}
    return updated


@router.delete("/{aggregator_id}")
def remove_aggregator(aggregator_id: str, user=Depends(get_current_user)):
    if not any(item.get("id") == aggregator_id for item in DEMO_DATA.get("aggregators", [])):
        raise HTTPException(status_code=404, detail="Aggregator not found")
    audit_log("aggregator.delete", user, "aggregators", {"id": aggregator_id})
    return {"deleted": True}
