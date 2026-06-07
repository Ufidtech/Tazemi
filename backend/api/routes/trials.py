from fastapi import APIRouter, Depends, HTTPException

from backend.auth import audit_log, get_current_user
from backend.data.demo_data import DEMO_DATA
from backend.models import TrialCreate, TrialPatch
from backend.services.trial_service import create_trial, delete_trial, get_trial_by_id, list_trials, update_trial

router = APIRouter()


@router.get("")
def read_trials():
    return DEMO_DATA.get("trials", [])


@router.get("/{trial_id}")
def read_trial(trial_id: str):
    trial = next((item for item in DEMO_DATA.get("trials", []) if item.get("id") == trial_id), None)
    if not trial:
        raise HTTPException(status_code=404, detail="Trial not found")
    return trial


@router.post("")
def write_trial(payload: TrialCreate, user=Depends(get_current_user)):
    record = create_trial({**payload.model_dump(), "created_by": user.get("uid")})
    audit_log("trial.create", user, "trials", {"id": record["id"]})
    return record


@router.patch("/{trial_id}")
def edit_trial(trial_id: str, payload: TrialPatch, user=Depends(get_current_user)):
    updated = next((item for item in DEMO_DATA.get("trials", []) if item.get("id") == trial_id), None)
    if not updated:
        raise HTTPException(status_code=404, detail="Trial not found")
    updated = {**updated, **payload.model_dump(exclude_unset=True), "id": trial_id}
    return updated


@router.delete("/{trial_id}")
def remove_trial(trial_id: str, user=Depends(get_current_user)):
    if not any(item.get("id") == trial_id for item in DEMO_DATA.get("trials", [])):
        raise HTTPException(status_code=404, detail="Trial not found")
    audit_log("trial.delete", user, "trials", {"id": trial_id})
    return {"deleted": True}
