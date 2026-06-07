from __future__ import annotations

from datetime import datetime, timezone

from backend.data.demo_data import DEMO_DATA
from backend.models import Truck
from backend.services.repository import Repository


_repo = Repository("trucks")


def _records():
    records = _repo.list()
    if records:
        return records
    return DEMO_DATA.get("trucks", [])

def list_trucks():
    records = _records()
    print("[truck_service] list_trucks:", records)
    return records

def get_truck_by_id(truck_id: str):
    return next((item for item in _records() if item.get("id") == truck_id), None)


def create_truck(payload: dict):
    record = Truck(**payload).model_dump()
    record["updated_at"] = datetime.now(timezone.utc).isoformat()
    _repo.upsert(record)
    return record


def update_truck(truck_id: str, payload: dict):
    record = get_truck_by_id(truck_id)
    if not record:
        return None
    updated = {**record, **payload, "id": truck_id, "updated_at": datetime.now(timezone.utc).isoformat()}
    _repo.upsert(updated)
    return updated


def delete_truck(truck_id: str):
    if not get_truck_by_id(truck_id):
        return False
    _repo.delete(truck_id)
    return True
