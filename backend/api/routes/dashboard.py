from fastapi import APIRouter

from backend.data.demo_data import DEMO_DATA
from backend.services.dashboard_service import get_dashboard_summary

router = APIRouter()


@router.get("/summary")
def dashboard_summary():
    return get_dashboard_summary()


@router.get("/activity")
def dashboard_activity():
    return DEMO_DATA.get("activity", [])
