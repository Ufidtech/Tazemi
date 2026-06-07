
from __future__ import annotations

from datetime import datetime, timezone

from backend.auth import sanitize_payload
from backend.models import Batch
from backend.services.repository import Repository


_repo = Repository("batches")


def _records():
    return _repo.list()


def list_batches():
    return _records()


def get_batch_by_id(batch_id: str):
    return next((item for item in _records() if item.get("id") == batch_id), None)


def create_batch(payload: dict):
    record = Batch(**sanitize_payload(payload)).model_dump()
    record["updated_at"] = datetime.now(timezone.utc).isoformat()
    _repo.upsert(record)
    return record


def update_batch(batch_id: str, payload: dict):
    record = get_batch_by_id(batch_id)
    if not record:
        return None
    updated = {**record, **sanitize_payload(payload), "id": batch_id, "updated_at": datetime.now(timezone.utc).isoformat()}
    _repo.upsert(updated)
    return updated


def delete_batch(batch_id: str):
    if not get_batch_by_id(batch_id):
        return False
    _repo.delete(batch_id)
    return True
