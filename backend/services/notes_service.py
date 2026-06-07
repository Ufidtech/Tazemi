from __future__ import annotations

from datetime import datetime, timezone

from backend.services.repository import Repository


_repo = Repository("notes")


def _records():
    return _repo.list()


def list_notes():
    return _records()


def create_note(payload: dict, user: dict):
    record = {
        **payload,
        "id": payload.get("id") or f"note_{len(_records()) + 1}",
        "created_at": datetime.now(timezone.utc).isoformat(),
        "updated_at": datetime.now(timezone.utc).isoformat(),
        "created_by": user.get("uid"),
    }
    _repo.upsert(record)
    return record
