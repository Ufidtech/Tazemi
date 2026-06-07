from __future__ import annotations

from datetime import datetime, timezone

from backend.auth import sanitize_payload
from backend.models import Aggregator
from backend.services.repository import Repository


_repo = Repository("aggregators")


def _records():
    return _repo.list()


def list_aggregators():
    return _records()


def get_aggregator_by_id(aggregator_id: str):
    return next((item for item in _records() if item.get("id") == aggregator_id), None)


def create_aggregator(payload: dict):
    record = Aggregator(**sanitize_payload(payload)).model_dump()
    record["updated_at"] = datetime.now(timezone.utc).isoformat()
    _repo.upsert(record)
    return record


def update_aggregator(aggregator_id: str, payload: dict):
    record = get_aggregator_by_id(aggregator_id)
    if not record:
        return None
    updated = {**record, **sanitize_payload(payload), "id": aggregator_id, "updated_at": datetime.now(timezone.utc).isoformat()}
    _repo.upsert(updated)
    return updated


def delete_aggregator(aggregator_id: str):
    if not get_aggregator_by_id(aggregator_id):
        return False
    _repo.delete(aggregator_id)
    return True
