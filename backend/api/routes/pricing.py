from fastapi import APIRouter, Body, Depends, HTTPException

from backend.auth import audit_log, resolve_actor
from backend.services.pricing_service import get_pricing, update_pricing

router = APIRouter()


@router.get("/current")
def read_pricing():
    return get_pricing()


@router.put("/current")
def edit_pricing(payload: dict = Body(default_factory=dict), user=Depends(resolve_actor)):
    if (user.get("role") or "").lower() != "ceo":
        raise HTTPException(status_code=403, detail="Only the CEO can update pricing")
    result = update_pricing(payload.get("active_rate"), payload.get("season"), user.get("uid"))
    audit_log("pricing.update", user, "pricing", {
        "active_rate": payload.get("active_rate"),
        "season": payload.get("season"),
    })
    return result
