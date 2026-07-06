import os

from fastapi import APIRouter

from backend.firebase import get_service_mode

router = APIRouter()


@router.get("/health")
def health_check():
    return {"status": "ok", "service": "tazemi-backend", "mode": get_service_mode()}


@router.get("/health/credentials")
def credential_check():
    """Presence/shape booleans only — never values. Safe diagnostic for
    misconfigured credential env vars on the host."""
    b64 = os.getenv("FIREBASE_SERVICE_ACCOUNT_B64") or ""
    raw = os.getenv("FIREBASE_SERVICE_ACCOUNT_JSON") or os.getenv("FIREBASE_CREDENTIALS_JSON") or ""
    b64_valid = False
    b64_project = None
    if b64:
        try:
            import base64
            import json as _json

            info = _json.loads(base64.b64decode(b64))
            b64_valid = bool(info.get("private_key")) and info.get("type") == "service_account"
            b64_project = info.get("project_id")
        except Exception:  # noqa: BLE001
            b64_valid = False
    return {
        "has_b64": bool(b64),
        "b64_length": len(b64),
        "b64_decodes_to_service_account": b64_valid,
        "b64_project_id": b64_project,
        "has_raw_json": bool(raw),
        "has_credentials_path": bool(os.getenv("GOOGLE_APPLICATION_CREDENTIALS")),
        "has_database_url": bool(os.getenv("FIREBASE_DATABASE_URL")),
    }
