from __future__ import annotations

import hashlib
import hmac
import secrets
from datetime import datetime, timedelta, timezone

from backend.services.repository import Repository

_users = Repository("users")

# How long a CEO-generated temporary password stays valid.
TEMP_PASSWORD_TTL_HOURS = 24

# Internal-only fields that must never leave the API.
_PRIVATE_FIELDS = {"password", "temp_password_hash", "temp_password_salt", "temp_password_expires_at"}


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
        {k: v for k, v in u.items() if k not in _PRIVATE_FIELDS}
        for u in _users.list()
    ]


def _find_by_email(email: str) -> dict | None:
    target = (email or "").strip().lower()
    if not target:
        return None
    for user in _users.list():
        if str(user.get("email") or "").strip().lower() == target:
            return user
    return None


def _hash_temp_password(value: str, salt: str) -> str:
    return hashlib.pbkdf2_hmac(
        "sha256", value.encode("utf-8"), salt.encode("utf-8"), 100_000
    ).hex()


def generate_temp_password(uid: str) -> dict | None:
    """Generate a one-time temporary password for a staff member (CEO action).

    Stores only a salted hash + expiry on the user record and returns the
    plaintext exactly once so the CEO can hand it to the staff member.
    """
    record = _users.get(uid)
    if not record:
        return None

    temp_password = secrets.token_urlsafe(9)
    salt = secrets.token_hex(16)
    expires_at = (
        datetime.now(timezone.utc) + timedelta(hours=TEMP_PASSWORD_TTL_HOURS)
    ).isoformat()

    _users.upsert(
        {
            **record,
            "temp_password_hash": _hash_temp_password(temp_password, salt),
            "temp_password_salt": salt,
            "temp_password_expires_at": expires_at,
            "updated_at": _now(),
        }
    )
    return {
        "uid": uid,
        "email": record.get("email"),
        "temp_password": temp_password,
        "expires_at": expires_at,
    }


def reset_password_with_temp(email: str, temp_password: str, new_password: str) -> dict:
    """Reset a user's password, requiring the CEO-generated temporary password.

    Verifies the temp password hash and expiry, updates the Firebase user's
    password, and invalidates the temp password. Raises HTTPException with a
    generic message so account existence is never revealed.
    """
    from fastapi import HTTPException

    generic = HTTPException(status_code=400, detail="Invalid email or temporary password")

    record = _find_by_email(email)
    if not record or not record.get("temp_password_hash") or not record.get("temp_password_salt"):
        raise generic

    expires_at = record.get("temp_password_expires_at")
    if expires_at:
        try:
            if datetime.fromisoformat(expires_at) < datetime.now(timezone.utc):
                raise generic
        except ValueError:
            raise generic from None

    candidate = _hash_temp_password(temp_password or "", record["temp_password_salt"])
    if not hmac.compare_digest(candidate, record["temp_password_hash"]):
        raise generic

    from firebase_admin import auth as firebase_auth

    from backend.firebase import initialize_firebase

    initialize_firebase()
    uid = record.get("uid") or record.get("id")
    try:
        firebase_auth.update_user(uid, password=new_password)
    except firebase_auth.UserNotFoundError as exc:
        raise generic from exc
    except Exception as exc:  # noqa: BLE001
        raise HTTPException(status_code=400, detail=f"Could not reset password: {exc}") from exc

    # Invalidate the temp password after successful use.
    cleared = {
        k: v for k, v in record.items()
        if k not in {"temp_password_hash", "temp_password_salt", "temp_password_expires_at"}
    }
    _users.upsert({**cleared, "updated_at": _now()})
    return {"reset": True, "email": record.get("email")}

