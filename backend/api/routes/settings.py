from fastapi import APIRouter, Body, Depends, HTTPException

from backend.auth import audit_log, resolve_actor
from backend.services.settings_service import get_hub_settings, update_hub_settings

router = APIRouter()


@router.get("/hub")
def read_hub():
    return get_hub_settings()


@router.put("/hub")
def edit_hub(payload: dict = Body(default_factory=dict), user=Depends(resolve_actor)):
    if (user.get("role") or "").lower() != "ceo":
        raise HTTPException(status_code=403, detail="Only the CEO can change hub settings")
    result = update_hub_settings(payload.get("hub_name"), payload.get("location"), user.get("uid"))
    audit_log("settings.hub", user, "settings", {
        "hub_name": payload.get("hub_name"),
        "location": payload.get("location"),
    })
    return result
