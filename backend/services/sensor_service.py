from __future__ import annotations

from datetime import datetime, timedelta, timezone

from backend.auth import sanitize_payload
from backend.models import SensorReading
from backend.services.alert_service import create_alert, should_alert
from backend.services.repository import Repository


_repo = Repository("sensor_readings")


def _records():
    return _repo.list()


def list_sensor_readings(truck_id: str | None = None):
    readings = _records()
    if truck_id:
        readings = [item for item in readings if item.get("truck_id") == truck_id]
    return readings


def create_sensor_reading(payload: dict):
    payload = sanitize_payload(payload)
    record = SensorReading(**payload).model_dump()
    record["updated_at"] = datetime.now(timezone.utc).isoformat()
    _repo.upsert(record)
    if should_alert(record):
        create_alert({
            "truck_id": record.get("truck_id"),
            "sensor_reading_id": record["id"],
            "type": "telemetry_threshold",
            "severity": record.get("severity") or "high",
            "message": "Telemetry threshold exceeded",
        })
    return record


def update_sensor_reading(reading_id: str, payload: dict):
    record = next((item for item in _records() if item.get("id") == reading_id), None)
    if not record:
        return None
    updated = {**record, **sanitize_payload(payload), "id": reading_id, "updated_at": datetime.now(timezone.utc).isoformat()}
    _repo.upsert(updated)
    return updated


def playback_sensor_readings(truck_id: str, start: str | None = None, end: str | None = None):
    readings = list_sensor_readings(truck_id)
    if start:
        readings = [item for item in readings if item.get("timestamp", "") >= start]
    if end:
        readings = [item for item in readings if item.get("timestamp", "") <= end]
    return readings
