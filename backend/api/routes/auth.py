from fastapi import APIRouter, Body, Depends, HTTPException

from backend.auth import (
    ROLE_MATRIX,
    assert_permission,
    clear_demo_sessions,
    consume_magic_link,
    create_magic_link,
    get_current_user,
    issue_session,
    refresh_session,
    revoke_session,
)
from backend.firebase import verify_id_token


class TokenTooEarlyError(HTTPException):
    pass

router = APIRouter()


@router.get("/roles")
def roles():
    return {"roles": list(ROLE_MATRIX.keys())}


@router.post("/login")
def login(payload: dict = Body(default_factory=dict)):
    provider = payload.get("provider", "firebase")
    if provider == "magic-link":
        email = payload.get("email") or (payload.get("user") or {}).get("email")
        if not email:
            raise HTTPException(status_code=400, detail="Missing email")
        return create_magic_link(email, role=payload.get("role", "read-only"))

    user = payload.get("user") or payload
    id_token = None
    if isinstance(user, dict):
        id_token = user.get("id_token") or payload.get("id_token")

    if id_token:
        try:
            decoded = verify_id_token(id_token)
        except Exception as exc:
            message = str(exc)
            if "Token used too early" in message:
                raise HTTPException(
                    status_code=401,
                    detail="Firebase token is not valid yet. Please check your computer clock and try again.",
                ) from exc
            raise HTTPException(status_code=401, detail="Invalid Firebase token") from exc

        user = {
            "uid": decoded.get("uid"),
            "email": decoded.get("email"),
            "name": decoded.get("name") or decoded.get("email") or "Firebase User",
            "role": payload.get("role") or decoded.get("role") or "read-only",
            "provider": "firebase",
        }
    elif isinstance(user, dict):
        user = {
            "uid": user.get("uid") or user.get("email") or "firebase-user",
            "email": user.get("email"),
            "name": user.get("name") or user.get("email") or "Firebase User",
            "role": payload.get("role") or user.get("role") or "read-only",
            "provider": "firebase",
        }
    else:
        raise HTTPException(status_code=400, detail="Missing user payload")

    session = issue_session(user, provider="firebase")
    return {"user": session["user"], "access_token": session["access_token"], "refresh_token": session["refresh_token"], "expires_at": session["expires_at"], "refresh_expires_at": session["refresh_expires_at"], "provider": session["provider"]}


@router.post("/magic-link/consume")
def consume(payload: dict = Body(default_factory=dict)):
    token = payload.get("token")
    if not token:
        raise HTTPException(status_code=400, detail="Missing token")
    return consume_magic_link(token)


@router.post("/refresh")
def refresh(payload: dict = Body(default_factory=dict)):
    refresh_token = payload.get("refresh_token")
    if not refresh_token:
        raise HTTPException(status_code=400, detail="Missing refresh_token")
    return refresh_session(refresh_token)


@router.post("/logout")
def logout(payload: dict = Body(default_factory=dict)):
    token = payload.get("access_token")
    if token:
        revoke_session(token)
    return {"logged_out": True}


@router.post("/logout-all")
def logout_all():
    clear_demo_sessions()
    return {"logged_out": True}


@router.get("/me")
async def read_me(user=Depends(get_current_user)):
    assert_permission(user, "read")
    return {"user": user, "permissions": ROLE_MATRIX.get((user.get("role") or "read-only").lower(), ROLE_MATRIX["read-only"])}


@router.post("/signup")
def signup(payload: dict = Body(default_factory=dict)):
    # INTERNAL ONLY: This endpoint is disabled for public signup.
    # Tazemi is an internal-only dashboard. Users must be created by backend/admin.
    # This endpoint delegates to /login for backward compatibility only.
    return login(payload)