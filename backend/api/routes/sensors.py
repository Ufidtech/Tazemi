from fastapi import APIRouter, Depends, HTTPException

from backend.auth import audit_log, enforce_rate_limit, get_current_user
from backend.models import SensorReadingCreate, SensorReadingPatch

router = APIRouter()


@router.get("")
def read_sensor_readings():
    from backend.services.sensor_service import list_sensor_readings

    return list_sensor_readings()


@router.post("")
def write_sensor_reading(payload: SensorReadingCreate, user=Depends(get_current_user)):
    enforce_rate_limit(user, write=True)
    from backend.services.sensor_service import create_sensor_reading

    record = create_sensor_reading({**payload.model_dump(), "created_by": user.get("uid")})
    audit_log("sensor.create", user, "sensor_readings", {"id": record["id"]})
    return record


@router.patch("/{reading_id}")
def edit_sensor_reading(reading_id: str, payload: SensorReadingPatch, user=Depends(get_current_user)):
    enforce_rate_limit(user, write=True)
    from backend.services.sensor_service import update_sensor_reading

    record = update_sensor_reading(reading_id, payload.model_dump(exclude_unset=True))
    if not record:
        raise HTTPException(status_code=404, detail="Sensor reading not found")
    audit_log("sensor.update", user, "sensor_readings", {"id": reading_id})
    return record
