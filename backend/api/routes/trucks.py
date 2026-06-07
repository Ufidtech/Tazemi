from fastapi import APIRouter, Depends, HTTPException

from backend.auth import audit_log, enforce_rate_limit, get_current_user, sanitize_payload
from backend.models import TruckCreate, TruckPatch
from backend.data.demo_data import DEMO_DATA
from backend.services.truck_service import create_truck as create_truck_record, delete_truck as delete_truck_record, get_truck_by_id, list_trucks, update_truck

router = APIRouter()


@router.get("")
def read_trucks():
    return DEMO_DATA.get("trucks", [])


@router.get("/{truck_id}")
def read_truck(truck_id: str):
    truck = next((item for item in DEMO_DATA.get("trucks", []) if item.get("id") == truck_id), None)
    if not truck:
        raise HTTPException(status_code=404, detail="Truck not found")
    return truck


@router.post("")
def write_truck(payload: TruckCreate, user=Depends(get_current_user)):
    enforce_rate_limit(user, write=True)
    data = sanitize_payload(payload.model_dump())
    data["created_by"] = user.get("uid")
    record = create_truck_record(data)
    audit_log("truck.create", user, "trucks", {"id": record["id"]})
    return record


@router.patch("/{truck_id}")
def edit_truck(truck_id: str, payload: TruckPatch, user=Depends(get_current_user)):
    enforce_rate_limit(user, write=True)
    record = update_truck(truck_id, sanitize_payload(payload.model_dump(exclude_unset=True)))
    if not record:
        raise HTTPException(status_code=404, detail="Truck not found")
    audit_log("truck.update", user, "trucks", {"id": truck_id})
    return record


@router.delete("/{truck_id}")
def delete_truck(truck_id: str, user=Depends(get_current_user)):
    enforce_rate_limit(user, write=True)
    if not delete_truck_record(truck_id):
        raise HTTPException(status_code=404, detail="Truck not found")
    audit_log("truck.delete", user, "trucks", {"id": truck_id})
    return {"deleted": True}
