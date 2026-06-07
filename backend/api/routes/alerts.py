from fastapi import APIRouter, Depends, HTTPException

from backend.auth import audit_log, enforce_rate_limit, get_current_user
from backend.models import AlertPatch
from backend.services.alert_service import delete_alert, list_alerts, resolve_alert as resolve_alert_record, update_alert

router = APIRouter()


@router.get("")
def read_alerts():
    return list_alerts()


@router.get("/me")
async def read_me(user=Depends(get_current_user)):
    return {"user": user}


@router.patch("/{alert_id}")
def edit_alert(alert_id: str, payload: AlertPatch, user=Depends(get_current_user)):
    enforce_rate_limit(user, write=True)
    record = update_alert(alert_id, payload.model_dump(exclude_unset=True))
    if not record:
        raise HTTPException(status_code=404, detail="Alert not found")
    audit_log("alert.update", user, "alerts", {"id": alert_id})
    return record


@router.post("/{alert_id}/resolve")
def resolve_alert(alert_id: str, user=Depends(get_current_user)):
    enforce_rate_limit(user, write=True)
    record = resolve_alert_record(alert_id)
    if not record:
        raise HTTPException(status_code=404, detail="Alert not found")
    audit_log("alert.resolve", user, "alerts", {"id": alert_id})
    return record


@router.delete("/{alert_id}")
def remove_alert(alert_id: str, user=Depends(get_current_user)):
    enforce_rate_limit(user, write=True)
    if not delete_alert(alert_id):
        raise HTTPException(status_code=404, detail="Alert not found")
    audit_log("alert.delete", user, "alerts", {"id": alert_id})
    return {"deleted": True}
