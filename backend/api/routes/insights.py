from fastapi import APIRouter, Depends

from backend.services.insight_service import get_recommendations

router = APIRouter()


@router.get("/recommendations")
def recommendations():
    return get_recommendations()
