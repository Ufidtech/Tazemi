from datetime import datetime, timedelta, timezone
import html
import re
from secrets import token_urlsafe
from typing import Any

from fastapi import Header, HTTPException
from firebase_admin import auth as firebase_auth

from backend.firebase import initialize_firebase

ROLE_MATRIX = {
    "ceo": {"read": True, "write": True, "admin": True},
    "admin": {"read": True, "write": True, "admin": True},
    "research": {"read": True, "write": True, "admin": False},
    "ops": {"read": True, "write": True, "admin": False},
    "read-only": {"read": True, "write": False, "admin": False},
    "board": {"read": True, "write": False, "admin": False},
    "investor": {"read": True, "write": False, "admin": False},
}

AUDIT_LOGS: list[dict[str, Any]] = []
SESSION_STORE: dict[str, dict[str, Any]] = {}
REFRESH_INDEX: dict[str, str] = {}
MAGIC_LINK_STORE: dict[str, dict[str, Any]] = {}
RATE_LIMIT_STORE: dict[str, list[datetime]] = {}
SESSION_TTL_HOURS = 24
REFRESH_TTL_DAYS = 30
MAGIC_LINK_TTL_MINUTES = 15
RATE_LIMIT_WINDOW_SECONDS = 60
RATE_LIMIT_MAX_REQUESTS = 120
RATE_LIMIT_WRITE_MAX_REQUESTS = 30


def _role_of(user: dict) -> str:
    role = (user.get("role") or user.get("custom_claims", {}).get("role") or "read-only").lower()
    return "ops" if role in {"operation", "operator"} else role


def assert_permission(user: dict, permission: str):
    if not ROLE_MATRIX.get(_role_of(user), ROLE_MATRIX["read-only"]).get(permission, False):
        raise HTTPException(status_code=403, detail="Insufficient permissions")


def assert_admin(user: dict):
    assert_permission(user, "admin")


def audit_log(action: str, user: dict | None = None, resource: str | None = None, metadata: dict | None = None):
    AUDIT_LOGS.append({"timestamp": datetime.now(timezone.utc).isoformat(), "action": action, "user": (user or {}).get("uid"), "role": _role_of(user or {}), "resource": resource, "metadata": metadata or {}})


def sanitize_text(value: str) -> str:
    return html.escape(value.strip())


def sanitize_payload(payload: dict | None) -> dict:
    if not isinstance(payload, dict):
        return {}
    cleaned = {}
    for key, value in payload.items():
        if isinstance(value, str):
            cleaned[key] = sanitize_text(value)
        elif isinstance(value, dict):
            cleaned[key] = sanitize_payload(value)
        elif isinstance(value, list):
            cleaned[key] = [sanitize_payload(item) if isinstance(item, dict) else item for item in value]
        else:
            cleaned[key] = value
    return cleaned


def enforce_rate_limit(user: dict | None, *, write: bool = False):
    now = datetime.now(timezone.utc)
    key = (user or {}).get("uid") or "anonymous"
    window_start = now - timedelta(seconds=RATE_LIMIT_WINDOW_SECONDS)
    entries = [ts for ts in RATE_LIMIT_STORE.get(key, []) if ts > window_start]
    limit = RATE_LIMIT_WRITE_MAX_REQUESTS if write else RATE_LIMIT_MAX_REQUESTS
    if len(entries) >= limit:
        raise HTTPException(status_code=429, detail="Rate limit exceeded")
    entries.append(now)
    RATE_LIMIT_STORE[key] = entries


def issue_session(user: dict, *, provider: str = "firebase") -> dict[str, Any]:
    now = datetime.now(timezone.utc)
    access_token = token_urlsafe(32)
    refresh_token = token_urlsafe(48)
    session = {"access_token": access_token, "refresh_token": refresh_token, "expires_at": (now + timedelta(hours=SESSION_TTL_HOURS)).isoformat(), "refresh_expires_at": (now + timedelta(days=REFRESH_TTL_DAYS)).isoformat(), "user": {**user, "role": _role_of(user)}, "provider": provider}
    SESSION_STORE[access_token] = session
    REFRESH_INDEX[refresh_token] = access_token
    return session


def create_magic_link(email: str, *, role: str = "read-only") -> dict[str, Any]:
    token = token_urlsafe(32)
    MAGIC_LINK_STORE[token] = {
        "email": email,
        "role": _role_of({"role": role}),
        "expires_at": (datetime.now(timezone.utc) + timedelta(minutes=MAGIC_LINK_TTL_MINUTES)).isoformat(),
    }
    return {"magic_link_token": token, "expires_in_minutes": MAGIC_LINK_TTL_MINUTES}


def consume_magic_link(token: str) -> dict[str, Any]:
    record = MAGIC_LINK_STORE.pop(token, None)
    if not record:
        raise HTTPException(status_code=401, detail="Invalid magic link")
    if datetime.fromisoformat(record["expires_at"]) < datetime.now(timezone.utc):
        raise HTTPException(status_code=401, detail="Magic link expired")
    return issue_session({"uid": record["email"], "email": record["email"], "role": record["role"]}, provider="magic-link")


def refresh_session(refresh_token: str) -> dict[str, Any]:
    session_token = REFRESH_INDEX.get(refresh_token)
    session = SESSION_STORE.get(session_token or "")
    if not session:
        raise HTTPException(status_code=401, detail="Invalid refresh token")
    if datetime.fromisoformat(session["refresh_expires_at"]) < datetime.now(timezone.utc):
        raise HTTPException(status_code=401, detail="Refresh token expired")
    revoke_session(session_token or "")
    return issue_session(session["user"], provider=session.get("provider", "firebase"))


def revoke_session(access_token: str) -> None:
    session = SESSION_STORE.pop(access_token, None)
    if session:
        REFRESH_INDEX.pop(session.get("refresh_token", ""), None)


def get_session_user(access_token: str) -> dict[str, Any]:
    session = SESSION_STORE.get(access_token)
    if not session:
        raise HTTPException(status_code=401, detail="Invalid or expired session")
    if datetime.fromisoformat(session["expires_at"]) < datetime.now(timezone.utc):
        raise HTTPException(status_code=401, detail="Session expired")
    return session["user"]


async def get_current_user(authorization: str | None = Header(default=None, alias="Authorization")):
    if not authorization:
        return {"uid": "demo-user", "email": "demo@tazemi.local", "role": "ceo", "provider": "demo"}
    if not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Missing bearer token")
    token = authorization.removeprefix("Bearer ").strip()
    try:
        initialize_firebase()
        decoded = firebase_auth.verify_id_token(token)
        decoded["role"] = _role_of(decoded)
        return decoded
    except Exception:
        return get_session_user(token)


def require_role(*allowed_roles: str):
    allowed = {role.lower() for role in allowed_roles}

    async def dependency(authorization: str | None = Header(default=None, alias="Authorization")):
        current_user = await get_current_user(authorization)
        if _role_of(current_user) not in allowed:
            raise HTTPException(status_code=403, detail="Insufficient role")
        return current_user

    return dependency


def require_https(request_headers: dict[str, str] | None = None) -> None:
    headers = {k.lower(): v for k, v in (request_headers or {}).items()}
    forwarded_proto = headers.get("x-forwarded-proto", "https")
    if forwarded_proto != "https":
        raise HTTPException(status_code=400, detail="HTTPS is required in production")


def clear_demo_sessions() -> None:
    SESSION_STORE.clear()
    REFRESH_INDEX.clear()
    MAGIC_LINK_STORE.clear()
    RATE_LIMIT_STORE.clear()
