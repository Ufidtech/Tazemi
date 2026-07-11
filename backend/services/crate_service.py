"""crate_service.py — /crates collection (TZ-KN-001 format).

Lifecycle per FIREBASE_COLLECTION spec:
  available → in_use → dispatched → returned (condition: serviceable)
                                  → damaged / lost (condition mirrors status)
Records are keyed by crate_id so the RTDB node is /crates/TZ-KN-001.
Timestamps are epoch milliseconds (matches the seeded rows).
"""

from __future__ import annotations

import time

from backend.firebase import get_service_mode, next_sequence
from backend.services.repository import Repository

_repo = Repository("crates")

CRATE_ID_PREFIX = "TZ-KN-"


def _now_ms() -> int:
    return int(time.time() * 1000)


def _allocate_crate_id() -> str:
    if get_service_mode() == "firebase":
        seq = next_sequence("crates")
    else:
        existing = _repo.list()
        seq = len(existing) + 1
    return f"{CRATE_ID_PREFIX}{seq:03d}"


def list_crates(status: str | None = None, aggregator_id: str | None = None):
    crates = _repo.list()
    if status:
        crates = [c for c in crates if c.get("status") == status]
    if aggregator_id:
        crates = [c for c in crates if c.get("current_aggregator_id") == aggregator_id]
    return crates


def get_crate(crate_id: str):
    return next((c for c in _repo.list() if c.get("crate_id") == crate_id), None)


def create_crate(grade: str, created_by: str | None = None):
    crate_id = _allocate_crate_id()
    record = {
        "id": crate_id,  # Repository keys on "id" → /crates/{crate_id}
        "crate_id": crate_id,
        "grade": grade,
        "status": "available",
        "current_aggregator_id": None,
        "current_batch_ref": None,
        "assigned_date": None,
        "dispatch_date": None,
        "return_date": None,
        "condition": "serviceable",
        "created_by": created_by,
    }
    _repo.upsert(record)
    return record


def update_crate(crate_id: str, payload: dict):
    record = get_crate(crate_id)
    if not record:
        return None
    updated = {**record, **payload, "id": crate_id, "crate_id": crate_id}
    _repo.upsert(updated)
    return updated


def assign_crate(crate_id: str, aggregator_id: str, batch_ref: str):
    record = get_crate(crate_id)
    if not record:
        return None
    if record.get("status") != "available":
        raise ValueError(f"crate {crate_id} is not available (status: {record.get('status')})")
    return update_crate(crate_id, {
        "status": "in_use",
        "current_aggregator_id": aggregator_id,
        "current_batch_ref": batch_ref,
        "assigned_date": _now_ms(),
        "return_date": None,
    })


def dispatch_crate(crate_id: str):
    record = get_crate(crate_id)
    if not record:
        return None
    if record.get("status") != "in_use":
        raise ValueError(f"crate {crate_id} is not in use (status: {record.get('status')})")
    return update_crate(crate_id, {
        "status": "dispatched",
        "dispatch_date": _now_ms(),
    })


def return_crate(crate_id: str, condition: str = "serviceable"):
    record = get_crate(crate_id)
    if not record:
        return None
    status = "returned" if condition == "serviceable" else condition
    return update_crate(crate_id, {
        "status": status,
        "condition": condition,
        "current_aggregator_id": None,
        "current_batch_ref": None,
        "return_date": _now_ms(),
    })
