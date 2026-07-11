"""operator_service.py — /operators collection (OP-KN-001 format).

PINs are stored as salted SHA-256 hashes ("sha256$<salt>$<hex>") — never
plaintext. verify_operator_pin also accepts legacy/seeded plaintext rows
so demo data keeps working, but new/updated records are always hashed.
"""

from __future__ import annotations

import hashlib
import hmac
import secrets

from backend.firebase import get_service_mode, next_sequence
from backend.services.repository import Repository

_repo = Repository("operators")

OPERATOR_ID_PREFIX = "OP-KN-"


def _hash_pin(pin: str, salt: str | None = None) -> str:
    salt = salt or secrets.token_hex(8)
    digest = hashlib.sha256(f"{salt}{pin}".encode("utf-8")).hexdigest()
    return f"sha256${salt}${digest}"


def _pin_matches(stored: str, pin: str) -> bool:
    if stored.startswith("sha256$"):
        _, salt, digest = stored.split("$", 2)
        expected = hashlib.sha256(f"{salt}{pin}".encode("utf-8")).hexdigest()
        return hmac.compare_digest(expected, digest)
    # Legacy/seeded plaintext rows
    return hmac.compare_digest(str(stored), str(pin))


def _allocate_operator_id() -> str:
    if get_service_mode() == "firebase":
        seq = next_sequence("operators")
    else:
        seq = len(_repo.list()) + 1
    return f"{OPERATOR_ID_PREFIX}{seq:03d}"


def _public(record: dict) -> dict:
    """Strip the pin before returning a record to any caller."""
    return {k: v for k, v in record.items() if k != "pin"}


def list_operators():
    return [_public(o) for o in _repo.list()]


def get_operator(operator_id: str, *, include_pin: bool = False):
    record = next((o for o in _repo.list() if o.get("operator_id") == operator_id), None)
    if record is None:
        return None
    return record if include_pin else _public(record)


def create_operator(name: str, role: str, pin: str, created_by: str | None = None):
    operator_id = _allocate_operator_id()
    record = {
        "id": operator_id,  # Repository keys on "id" → /operators/{operator_id}
        "operator_id": operator_id,
        "name": name,
        "role": role,
        "pin": _hash_pin(pin),
        "status": "active",
        "created_by": created_by,
    }
    _repo.upsert(record)
    return _public(record)


def update_operator(operator_id: str, payload: dict):
    record = get_operator(operator_id, include_pin=True)
    if not record:
        return None
    if "pin" in payload and payload["pin"] is not None:
        payload = {**payload, "pin": _hash_pin(payload["pin"])}
    updated = {**record, **payload, "id": operator_id, "operator_id": operator_id}
    _repo.upsert(updated)
    return _public(updated)


def delete_operator(operator_id: str) -> bool:
    if not get_operator(operator_id):
        return False
    _repo.delete(operator_id)
    return True


def verify_operator_pin(operator_id: str, pin: str):
    """Return the operator (without pin) if the PIN matches, else None.

    Deactivated operators (status "inactive") can never log in —
    reactivate via PATCH {status: "active"} first.
    """
    record = get_operator(operator_id, include_pin=True)
    if not record:
        return None
    if record.get("status") == "inactive":
        return None
    if _pin_matches(str(record.get("pin", "")), str(pin)):
        return _public(record)
    return None
