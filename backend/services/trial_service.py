from __future__ import annotations

from datetime import datetime, timezone

from backend.auth import sanitize_payload
from backend.models import Trial
from backend.services.repository import Repository


_repo = Repository("trials")


def _records():
    return _repo.list()


def list_trials():
    return _records()


def get_trial_by_id(trial_id: str):
    return next((item for item in _records() if item.get("id") == trial_id), None)


def create_trial(payload: dict):
    record = Trial(**sanitize_payload(payload)).model_dump()
    record["updated_at"] = datetime.now(timezone.utc).isoformat()
    _repo.upsert(record)
    return record


def update_trial(trial_id: str, payload: dict):
    record = get_trial_by_id(trial_id)
    if not record:
        return None
    updated = {**record, **sanitize_payload(payload), "id": trial_id, "updated_at": datetime.now(timezone.utc).isoformat()}
    _repo.upsert(updated)
    return updated


def delete_trial(trial_id: str):
    if not get_trial_by_id(trial_id):
        return False
    _repo.delete(trial_id)
    return True
