from fastapi import APIRouter, Depends

from backend.auth import assert_permission, get_current_user
from backend.models import SensorReadingCreate, TruckCreate
from backend.services.sensor_service import create_sensor_reading
from backend.services.truck_service import create_truck

router = APIRouter()


@router.post("/telemetry")
def ingest_telemetry(payload: dict, user=Depends(get_current_user)):
    assert_permission(user, "write")
    reading = SensorReadingCreate(**payload).model_dump()
    reading["created_by"] = user.get("uid")
    return create_sensor_reading(reading)


@router.post("/sensor-readings")
def ingest_sensor_reading(payload: dict, user=Depends(get_current_user)):
    assert_permission(user, "write")
    reading = SensorReadingCreate(**payload).model_dump()
    reading["created_by"] = user.get("uid")
    return create_sensor_reading(reading)


@router.post("/trucks")
def ingest_truck(payload: dict, user=Depends(get_current_user)):
    assert_permission(user, "write")
    if "truck_id" in payload:
        payload = {**payload, "id": payload.get("truck_id")}
    truck = TruckCreate(**payload).model_dump()
    truck["created_by"] = user.get("uid")
    return create_truck(truck)
