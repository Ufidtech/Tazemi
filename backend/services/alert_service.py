from __future__ import annotations

from datetime import datetime, timedelta, timezone

from backend.services.repository import Repository

COOLDOWN_MINUTES = 30


_repo = Repository("alerts")


def _records():
    return _repo.list()


def list_alerts():
    return _records()


def get_alert_by_id(alert_id: str):
    return next((item for item in _records() if item.get("id") == alert_id), None)


def create_alert(payload: dict):
    record = {**payload}
    record.setdefault("id", f"alert_{len(_records()) + 1}")
    record.setdefault("created_at", datetime.now(timezone.utc).isoformat())
    record.setdefault("updated_at", datetime.now(timezone.utc).isoformat())
    record.setdefault("cooldown_until", (datetime.now(timezone.utc) + timedelta(minutes=COOLDOWN_MINUTES)).isoformat())
    _repo.upsert(record)
    return record


def update_alert(alert_id: str, payload: dict):
    record = get_alert_by_id(alert_id)
    if not record:
        return None
    updated = {**record, **payload, "id": alert_id, "updated_at": datetime.now(timezone.utc).isoformat()}
    _repo.upsert(updated)
    return updated


def resolve_alert(alert_id: str):
    return update_alert(alert_id, {"status": "resolved"})



def delete_alert(alert_id: str):
    if not get_alert_by_id(alert_id):
        return False
    _repo.delete(alert_id)
    return True


def should_alert(sensor_reading: dict):
    temp = float(sensor_reading.get("temperature", sensor_reading.get("temp", 0)) or 0)
    humidity = float(sensor_reading.get("humidity", 0) or 0)
    gas = float(sensor_reading.get("gas_ppm", sensor_reading.get("gas", 0)) or 0)
    vibration = float(sensor_reading.get("vibration_g", sensor_reading.get("vibration", 0)) or 0)
    if sensor_reading.get("severity") in {"high", "critical"}:
        return True
    return temp >= 34 or humidity >= 75 or gas >= 1000 or vibration >= 2.5
