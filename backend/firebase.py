from __future__ import annotations

import json
import os
from functools import lru_cache
from pathlib import Path
from typing import Any

from dotenv import load_dotenv

load_dotenv()

import firebase_admin
from firebase_admin import auth as firebase_auth
from firebase_admin import credentials, db


class FirebaseConfigurationError(RuntimeError):
    pass


@lru_cache(maxsize=1)
def initialize_firebase():
    """Initialize Firebase Admin once and reuse the app.

    Supports either:
    - FIREBASE_SERVICE_ACCOUNT_JSON: raw JSON string from the service account file
    - GOOGLE_APPLICATION_CREDENTIALS: filesystem path to the service account JSON file
    - FIREBASE_CREDENTIALS_JSON: alias for the raw JSON string
    """
    if firebase_admin._apps:
        return firebase_admin.get_app()

    service_account_json = os.getenv("FIREBASE_SERVICE_ACCOUNT_JSON") or os.getenv("FIREBASE_CREDENTIALS_JSON")
    service_account_path = os.getenv("GOOGLE_APPLICATION_CREDENTIALS")
    database_url = os.getenv("FIREBASE_DATABASE_URL")
    project_id = os.getenv("FIREBASE_PROJECT_ID")

    if not database_url:
        raise FirebaseConfigurationError("FIREBASE_DATABASE_URL is required to initialize Firebase")

    if service_account_json:
        service_account_info = json.loads(service_account_json)
        cred = credentials.Certificate(service_account_info)
    elif service_account_path:
        cred = credentials.Certificate(Path(service_account_path))
    else:
        raise FirebaseConfigurationError(
            "Set FIREBASE_SERVICE_ACCOUNT_JSON, FIREBASE_CREDENTIALS_JSON, or GOOGLE_APPLICATION_CREDENTIALS"
        )

    options: dict[str, Any] = {"databaseURL": database_url}
    if project_id:
        options["projectId"] = project_id

    return firebase_admin.initialize_app(cred, options)


def get_db_reference(path: str = "/"):
    initialize_firebase()
    normalized = path if path.startswith("/") else f"/{path}"
    return db.reference(normalized)


def verify_id_token(token: str):
    initialize_firebase()
    return firebase_auth.verify_id_token(token, clock_skew_seconds=60)


def get_custom_claims(decoded_token: dict) -> dict:
    return decoded_token.get("claims", {}) or {}


def has_role(decoded_token: dict, *roles: str) -> bool:
    claims = get_custom_claims(decoded_token)
    role = (claims.get("role") or decoded_token.get("role") or "").lower()
    return role in {r.lower() for r in roles} or role == "admin"


def is_admin(decoded_token: dict) -> bool:
    return has_role(decoded_token, "admin")


def get_service_mode() -> str:
    enabled = os.getenv("FIREBASE_DATABASE_URL") and (
        os.getenv("FIREBASE_SERVICE_ACCOUNT_JSON")
        or os.getenv("FIREBASE_CREDENTIALS_JSON")
        or os.getenv("GOOGLE_APPLICATION_CREDENTIALS")
    )
    return "firebase" if enabled else "demo"


def sync_demo_to_firebase(collection: str, items: list[dict]) -> int:
    """Utility to migrate demo data into Firebase Realtime Database.

    Returns the number of records written.
    """
    initialize_firebase()
    ref = get_db_reference(collection)
    written = 0
    for item in items:
        if item.get("id"):
            ref.child(item["id"]).set(item)
            written += 1
    return written


def ensure_initialized() -> None:
    try:
        initialize_firebase()
    except Exception:
        pass
