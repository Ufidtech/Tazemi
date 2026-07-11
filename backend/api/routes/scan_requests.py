from fastapi import APIRouter, Depends, HTTPException

from backend.auth import audit_log, resolve_actor
from backend.services.scan_request_service import (
    archive_scan_request,
    delete_scan_request,
    expire_scan_request,
)

router = APIRouter()

STAFF_ROLES = {"ceo", "field_operator"}


def _require_staff(user: dict):
    if (user.get("role") or "").lower() not in STAFF_ROLES:
        raise HTTPException(status_code=403, detail="Insufficient role")


@router.post("/{session_id}/archive")
def archive(session_id: str, user=Depends(resolve_actor)):
    _require_staff(user)
    archived = archive_scan_request(session_id)
    audit_log("scan_request.archive", user, "scan_requests", {"id": session_id})
    return {"archived": archived}


@router.post("/{session_id}/expire")
def expire(session_id: str, user=Depends(resolve_actor)):
    _require_staff(user)
    expired = expire_scan_request(session_id)
    audit_log("scan_request.expire", user, "scan_requests", {"id": session_id})
    return {"expired": expired}


@router.delete("/{session_id}")
def remove(session_id: str, user=Depends(resolve_actor)):
    _require_staff(user)
    deleted = delete_scan_request(session_id)
    return {"deleted": deleted}
