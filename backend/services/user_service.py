from __future__ import annotations

from datetime import datetime, timezone

from backend.services.repository import Repository

_users = Repository("users")


def _now() -> str:
    return datetime.now(timezone.utc).isoformat()


def get_user(uid: str) -> dict | None:
    return _users.get(uid)


def find_or_create_user(decoded: dict, fallback_role: str) -> dict:
    """Find a user by uid/email or create one; role is loaded from the DB.

    The DB is the source of truth for role. A newly created user is seeded with
    ``fallback_role`` (from Firebase custom claim / STAFF_ROLES mapping).
    """
    uid = decoded.get("uid") or decoded.get("email")
    if not uid:
        return {"uid": None, "email": decoded.get("email"), "name": decoded.get("name"), "role": fallback_role}

    existing = _users.get(uid)
    now = _now()
    if existing:
        # Keep profile fields fresh but preserve the DB role.
        updated = {
            **existing,
            "email": decoded.get("email") or existing.get("email"),
            "name": decoded.get("name") or existing.get("name") or (decoded.get("email") or uid),
            "provider": decoded.get("provider") or existing.get("provider") or "firebase",
            "updated_at": now,
        }
        if updated != existing:
            _users.upsert(updated)
        return updated

    record = {
        "id": uid,
        "uid": uid,
        "email": decoded.get("email"),
        "name": decoded.get("name") or (decoded.get("email") or uid),
        "role": fallback_role,
        "provider": decoded.get("provider") or "firebase",
        "created_at": now,
        "updated_at": now,
    }
    _users.upsert(record)
    return record


def role_from_db(uid: str | None) -> str | None:
    if not uid:
        return None
    record = _users.get(uid)
    return record.get("role") if record else None


def set_role(uid: str, role: str) -> dict | None:
    record = _users.get(uid)
    if not record:
        return None
    record = {**record, "role": role, "updated_at": _now()}
    _users.upsert(record)
    return record


def create_staff_user(email: str, password: str, name: str | None, role: str) -> dict:
    """Create a Firebase Email/Password user, assign the role claim + DB record.

    Requires Firebase to be configured. Raises HTTPException on failure.
    """
    from fastapi import HTTPException
    from firebase_admin import auth as firebase_auth

    from backend.firebase import initialize_firebase

    initialize_firebase()
    try:
        user = firebase_auth.create_user(
            email=email,
            password=password,
            display_name=name or email.split("@")[0],
        )
    except firebase_auth.EmailAlreadyExistsError as exc:
        raise HTTPException(status_code=409, detail="A user with this email already exists") from exc
    except Exception as exc:  # noqa: BLE001
        raise HTTPException(status_code=400, detail=f"Could not create user: {exc}") from exc

    firebase_auth.set_custom_user_claims(user.uid, {"role": role})
    record = find_or_create_user(
        {"uid": user.uid, "email": email, "name": name, "provider": "firebase"}, role
    )
    set_role(user.uid, role)
    return {"uid": user.uid, "email": email, "name": record.get("name"), "role": role}


def list_staff() -> list[dict]:
    return [
        {k: v for k, v in u.items() if k != "password"}
        for u in _users.list()
    ]

