from fastapi import APIRouter, Body, Depends, HTTPException

from backend.auth import (
    ROLE_MATRIX,
    SESSION_STORE,
    assert_permission,
    audit_log,
    clear_demo_sessions,
    consume_magic_link,
    create_magic_link,
    get_current_user,
    issue_session,
    refresh_session,
    resolve_actor,
    resolve_token_role,
    revoke_session,
)
from backend.firebase import verify_id_token
from backend.services.staff_service import authenticate
from backend.services.user_service import (
    create_staff_user,
    find_or_create_user,
    generate_temp_password,
    list_staff,
    reset_password_with_temp,
)


class TokenTooEarlyError(HTTPException):
    pass

router = APIRouter()


@router.get("/roles")
def roles():
    return {"roles": ["ceo", "field_operator"]}


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

    # Direct email/password login against the backend staff store.
    email = payload.get("email") or (user.get("email") if isinstance(user, dict) else None)
    password = payload.get("password") or (user.get("password") if isinstance(user, dict) else None)
    if not id_token and (provider == "password" or password):
        authenticated = authenticate(email, password)
        if not authenticated:
            raise HTTPException(status_code=401, detail="Invalid email or password")
        session = issue_session(authenticated, provider="password")
        return {"user": session["user"], "access_token": session["access_token"], "refresh_token": session["refresh_token"], "expires_at": session["expires_at"], "refresh_expires_at": session["refresh_expires_at"], "provider": session["provider"]}

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

        # Find or create the user in the DB and load the role from the DB.
        db_user = find_or_create_user({**decoded, "provider": "firebase"}, resolve_token_role(decoded))
        user = {
            "uid": decoded.get("uid"),
            "email": decoded.get("email"),
            "name": decoded.get("name") or decoded.get("email") or "Firebase User",
            "role": db_user.get("role") or resolve_token_role(decoded),
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
        session_user = SESSION_STORE.get(token, {}).get("user")
        audit_log("auth.logout", session_user, "auth", {"had_token": True})
        revoke_session(token)
    else:
        audit_log("auth.logout", None, "auth", {"had_token": False})
    return {"logged_out": True}


@router.post("/logout-all")
def logout_all():
    clear_demo_sessions()
    return {"logged_out": True}


@router.get("/me")
async def read_me(user=Depends(get_current_user)):
    assert_permission(user, "read")
    return {"user": user, "permissions": ROLE_MATRIX.get((user.get("role") or "read-only").lower(), ROLE_MATRIX["read-only"])}


STAFF_ADMIN_ROLES = {"ceo", "admin"}
ASSIGNABLE_ROLES = {"ceo", "field_operator"}


@router.get("/users")
def read_staff(actor=Depends(resolve_actor)):
    if (actor.get("role") or "").lower() not in STAFF_ADMIN_ROLES:
        raise HTTPException(status_code=403, detail="Only the CEO can manage staff")
    return list_staff()


@router.post("/users")
def create_staff(payload: dict = Body(default_factory=dict), actor=Depends(resolve_actor)):
    if (actor.get("role") or "").lower() not in STAFF_ADMIN_ROLES:
        raise HTTPException(status_code=403, detail="Only the CEO can create staff accounts")

    email = (payload.get("email") or "").strip()
    password = payload.get("password") or ""
    name = (payload.get("name") or "").strip() or None
    role = (payload.get("role") or "field_operator").lower()

    if "@" not in email:
        raise HTTPException(status_code=400, detail="A valid email is required")
    if len(password) < 6:
        raise HTTPException(status_code=400, detail="Password must be at least 6 characters")
    if role not in ASSIGNABLE_ROLES:
        raise HTTPException(status_code=400, detail="Role must be 'ceo' or 'field_operator'")

    created = create_staff_user(email, password, name, role)
    audit_log("staff.create", actor, "users", {"email": email, "role": role})
    return created


@router.post("/users/{uid}/temp-password")
def create_temp_password(uid: str, actor=Depends(resolve_actor)):
    """CEO generates a one-time temporary password for a staff member.

    The plaintext is returned exactly once; the staff member uses it in the
    "Forgot password" flow to set a new password.
    """
    if (actor.get("role") or "").lower() not in STAFF_ADMIN_ROLES:
        raise HTTPException(status_code=403, detail="Only the CEO can generate temporary passwords")

    result = generate_temp_password(uid)
    if not result:
        raise HTTPException(status_code=404, detail="Staff member not found")
    audit_log("staff.temp_password", actor, "users", {"uid": uid, "email": result.get("email")})
    return result


@router.post("/password/reset")
def reset_password(payload: dict = Body(default_factory=dict)):
    """Reset a password using the CEO-generated temporary password."""
    email = (payload.get("email") or "").strip()
    temp_password = payload.get("temp_password") or ""
    new_password = payload.get("new_password") or ""

    if "@" not in email:
        raise HTTPException(status_code=400, detail="A valid email is required")
    if not temp_password:
        raise HTTPException(status_code=400, detail="The temporary password from your CEO is required")
    if len(new_password) < 6:
        raise HTTPException(status_code=400, detail="New password must be at least 6 characters")

    result = reset_password_with_temp(email, temp_password, new_password)
    audit_log("auth.password_reset", None, "auth", {"email": email})
    return result


@router.post("/signup")
def signup(payload: dict = Body(default_factory=dict)):
    # INTERNAL ONLY: This endpoint is disabled for public signup.
    # Tazemi is an internal-only dashboard. Users must be created by backend/admin.
    # This endpoint delegates to /login for backward compatibility only.
    return login(payload)