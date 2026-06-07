from fastapi import APIRouter, Depends, HTTPException

from backend.auth import audit_log, get_current_user
from backend.data.demo_data import DEMO_DATA
from backend.models import BatchCreate, BatchPatch
from backend.services.batch_service import create_batch, delete_batch, get_batch_by_id, list_batches, update_batch

router = APIRouter()


@router.get("")
def read_batches():
    return DEMO_DATA.get("batches", [])


@router.get("/{batch_id}")
def read_batch(batch_id: str):
    batch = next((item for item in DEMO_DATA.get("batches", []) if item.get("id") == batch_id), None)
    if not batch:
        raise HTTPException(status_code=404, detail="Batch not found")
    return batch


@router.post("")
def write_batch(payload: BatchCreate, user=Depends(get_current_user)):
    data = payload.model_dump()
    data["created_by"] = user.get("uid")
    record = create_batch(data)
    audit_log("batch.create", user, "batches", {"id": record["id"]})
    return record


@router.patch("/{batch_id}")
def edit_batch(batch_id: str, payload: BatchPatch, user=Depends(get_current_user)):
    updated = next((item for item in DEMO_DATA.get("batches", []) if item.get("id") == batch_id), None)
    if not updated:
        raise HTTPException(status_code=404, detail="Batch not found")
    updated = {**updated, **payload.model_dump(exclude_unset=True), "id": batch_id}
    return updated


@router.delete("/{batch_id}")
def remove_batch(batch_id: str, user=Depends(get_current_user)):
    if not any(item.get("id") == batch_id for item in DEMO_DATA.get("batches", [])):
        raise HTTPException(status_code=404, detail="Batch not found")
    audit_log("batch.delete", user, "batches", {"id": batch_id})
    return {"deleted": True}
