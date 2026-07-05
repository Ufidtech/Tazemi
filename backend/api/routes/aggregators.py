from fastapi import APIRouter, Body, Depends, File, Form, HTTPException, UploadFile

from backend.auth import audit_log, get_current_user, resolve_actor
from backend.data.demo_data import DEMO_DATA
from backend.models import AggregatorCreate, AggregatorPatch
from backend.services.aggregator_service import create_aggregator, delete_aggregator, get_aggregator_by_id, list_aggregators, update_aggregator
from backend.services.registration_service import (
    get_registration,
    list_registrations,
    list_transactions,
    register_aggregator,
    topup_aggregator,
    update_registration,
)

router = APIRouter()

ALLOWED_REGISTRATION_ROLES = {"ceo", "field_operator"}


@router.get("")
def read_aggregators():
    return DEMO_DATA.get("aggregators", []) + list_registrations()


@router.post("/register")
async def register(
    full_name: str = Form(...),
    phone_number: str = Form(...),
    market_location: str = Form(...),
    nin_or_bvn: str = Form(...),
    rfid_uid: str = Form(...),
    initial_topup: float = Form(...),
    created_by: str = Form(...),
    photo: UploadFile = File(...),
    user=Depends(resolve_actor),
):
    role = (user.get("role") or "").lower()
    if role not in ALLOWED_REGISTRATION_ROLES:
        raise HTTPException(status_code=403, detail="Insufficient role")

    photo_bytes = await photo.read()
    result = register_aggregator(
        {
            "full_name": full_name,
            "phone_number": phone_number,
            "market_location": market_location,
            "nin_or_bvn": nin_or_bvn,
            "rfid_uid": rfid_uid,
            "initial_topup": initial_topup,
            # Trust the authenticated identity, not the client-supplied value.
            "created_by": user.get("uid") or created_by,
        },
        photo.filename,
        photo_bytes,
        photo.content_type,
    )
    audit_log("aggregator.register", user, "aggregators", {"id": result["id"]})
    return result


@router.get("/{aggregator_id}")
def read_aggregator(aggregator_id: str):
    aggregator = next((item for item in DEMO_DATA.get("aggregators", []) if item.get("id") == aggregator_id), None)
    if not aggregator:
        aggregator = get_registration(aggregator_id)
    if not aggregator:
        raise HTTPException(status_code=404, detail="Aggregator not found")
    return aggregator


@router.post("/{aggregator_id}/topup")
def topup(aggregator_id: str, payload: dict = Body(default_factory=dict), user=Depends(resolve_actor)):
    role = (user.get("role") or "").lower()
    if role not in ALLOWED_REGISTRATION_ROLES:
        raise HTTPException(status_code=403, detail="Insufficient role")
    amount = payload.get("amount")
    method = payload.get("method", "cash")
    note = payload.get("note", "")
    result = topup_aggregator(aggregator_id, amount, user.get("uid") or payload.get("created_by"), method=method, note=note)
    audit_log("aggregator.topup", user, "aggregators", {"id": aggregator_id, "amount": amount, "method": method})
    return result


@router.get("/{aggregator_id}/transactions")
def read_transactions(aggregator_id: str):
    return list_transactions(aggregator_id)


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


@router.put("/{aggregator_id}")
def replace_aggregator(aggregator_id: str, payload: dict = Body(default_factory=dict), user=Depends(resolve_actor)):
    role = (user.get("role") or "").lower()
    if role not in ALLOWED_REGISTRATION_ROLES:
        raise HTTPException(status_code=403, detail="Insufficient role")

    updated = update_registration(aggregator_id, payload)
    if updated:
        audit_log("aggregator.update", user, "aggregators", {"id": aggregator_id})
        return updated

    demo = next((item for item in DEMO_DATA.get("aggregators", []) if item.get("id") == aggregator_id), None)
    if not demo:
        raise HTTPException(status_code=404, detail="Aggregator not found")
    merged = {**demo, **payload, "id": aggregator_id}
    audit_log("aggregator.update", user, "aggregators", {"id": aggregator_id})
    return merged
