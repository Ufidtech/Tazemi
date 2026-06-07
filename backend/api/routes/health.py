from fastapi import APIRouter

from backend.firebase import get_service_mode

router = APIRouter()


@router.get("/health")
def health_check():
    return {"status": "ok", "service": "tazemi-backend", "mode": get_service_mode()}
