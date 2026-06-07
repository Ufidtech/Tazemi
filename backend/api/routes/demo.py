from fastapi import APIRouter

from backend.data.demo_data import DEMO_DATA

router = APIRouter(prefix="/demo", tags=["demo"])


@router.get("")
def get_demo_data():
    return {"data": DEMO_DATA}
