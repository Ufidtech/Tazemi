from __future__ import annotations

import json
import os
from secrets import compare_digest

from backend.auth import local_auth_allowed

# Demo staff accounts used only when STAFF_USERS is not configured and local
# auth is allowed (i.e. never in production). Override in real environments by
# setting the STAFF_USERS env var to a JSON array of user objects.
DEMO_STAFF = [
    {"uid": "staff-ceo", "email": "ceo@tazemi.com", "password": "tazemi123", "name": "Tazemi CEO", "role": "ceo"},
    {"uid": "staff-operator", "email": "operator@tazemi.com", "password": "tazemi123", "name": "Field Operator", "role": "field_operator"},
]


def _staff_users() -> list[dict]:
    raw = os.getenv("STAFF_USERS")
    if raw:
        try:
            users = json.loads(raw)
            return users if isinstance(users, list) else []
        except json.JSONDecodeError:
            return []
    if local_auth_allowed():
        return DEMO_STAFF
    return []


def authenticate(email: str, password: str) -> dict | None:
    """Return a normalized staff user if the credentials match, else None."""
    target = (email or "").strip().lower()
    for user in _staff_users():
        if str(user.get("email", "")).strip().lower() == target and compare_digest(
            str(user.get("password", "")), str(password or "")
        ):
            return {
                "uid": user.get("uid") or user["email"],
                "email": user["email"],
                "name": user.get("name") or user["email"].split("@")[0],
                "role": user.get("role", "read-only"),
            }
    return None


def _staff_roles_map() -> dict[str, str]:
    """Map of email -> role for assigning roles to Firebase-authenticated users.

    Configured via STAFF_ROLES (JSON object). Falls back to the demo staff
    roles when local auth is allowed (never in production).
    """
    raw = os.getenv("STAFF_ROLES")
    if raw:
        try:
            mapping = json.loads(raw)
            if isinstance(mapping, dict):
                return {str(k).strip().lower(): str(v) for k, v in mapping.items()}
        except json.JSONDecodeError:
            return {}
    if local_auth_allowed():
        return {u["email"].lower(): u["role"] for u in DEMO_STAFF}
    return {}


def role_for_email(email: str, default: str | None = None) -> str | None:
    """Resolve a role for an email from the STAFF_ROLES mapping."""
    return _staff_roles_map().get((email or "").strip().lower(), default)

