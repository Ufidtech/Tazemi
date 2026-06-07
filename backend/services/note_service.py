from __future__ import annotations

from datetime import datetime, timezone

from backend.auth import sanitize_payload
from backend.models import CTONote
from backend.services.repository import Repository


_repo = Repository("notes")


def _records():
    return _repo.list()


def list_notes():
    return _records()


def get_note_by_id(note_id: str):
    return next((item for item in _records() if item.get("id") == note_id), None)


def create_note(payload: dict, user: dict):
    payload = sanitize_payload(payload)
    record = CTONote(**{**payload, "created_by": user.get("uid")}).model_dump()
    record["updated_at"] = datetime.now(timezone.utc).isoformat()
    _repo.upsert(record)
    return record


def update_note(note_id: str, payload: dict, user: dict):
    record = get_note_by_id(note_id)
    if not record:
        return None
    updated = {**record, **sanitize_payload(payload), "id": note_id, "updated_at": datetime.now(timezone.utc).isoformat(), "created_by": record.get("created_by") or user.get("uid"), "updated_by": user.get("uid")}
    _repo.upsert(updated)
    return updated


def delete_note(note_id: str):
    if not get_note_by_id(note_id):
        return False
    _repo.delete(note_id)
    return True
