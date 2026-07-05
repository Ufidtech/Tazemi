from __future__ import annotations

import json
import os
from functools import lru_cache
from pathlib import Path
from typing import Any

from dotenv import load_dotenv

# Load the repo-root .env (shared/frontend) first, then backend/.env which holds
# backend-only secrets and takes precedence for backend keys.
load_dotenv()
load_dotenv(Path(__file__).resolve().parent / ".env", override=True)

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
    storage_bucket = os.getenv("FIREBASE_STORAGE_BUCKET")

    if not database_url:
        raise FirebaseConfigurationError("FIREBASE_DATABASE_URL is required to initialize Firebase")

    if service_account_json:
        try:
            service_account_info = json.loads(service_account_json)
            cred = credentials.Certificate(service_account_info)
        except (json.JSONDecodeError, ValueError) as exc:
            if service_account_path:
                cred = credentials.Certificate(Path(service_account_path))
            else:
                raise FirebaseConfigurationError(
                    "FIREBASE_SERVICE_ACCOUNT_JSON is not valid JSON (a service-account key does not "
                    "paste cleanly into a .env file). Save the downloaded key as a file and set "
                    "GOOGLE_APPLICATION_CREDENTIALS to its path instead."
                ) from exc
    elif service_account_path:
        cred = credentials.Certificate(Path(service_account_path))
    else:
        raise FirebaseConfigurationError(
            "Set FIREBASE_SERVICE_ACCOUNT_JSON, FIREBASE_CREDENTIALS_JSON, or GOOGLE_APPLICATION_CREDENTIALS"
        )

    options: dict[str, Any] = {"databaseURL": database_url}
    if project_id:
        options["projectId"] = project_id
    if storage_bucket:
        options["storageBucket"] = storage_bucket

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


def upload_bytes_to_storage(path: str, data: bytes, content_type: str | None = None) -> str:
    """Upload bytes to Firebase Storage and return a private storage reference.

    The object is NOT made public. A ``gs://`` reference is returned so that
    access can be brokered later via short-lived signed URLs. Requires
    FIREBASE_STORAGE_BUCKET to be configured.
    """
    from firebase_admin import storage

    initialize_firebase()
    bucket_name = os.getenv("FIREBASE_STORAGE_BUCKET")
    bucket = storage.bucket(bucket_name) if bucket_name else storage.bucket()
    blob = bucket.blob(path)
    blob.upload_from_string(data, content_type=content_type)
    return f"gs://{bucket.name}/{path}"


def generate_signed_photo_url(storage_reference: str, expiry_minutes: int = 15) -> str | None:
    """Generate a short-lived signed URL for a ``gs://bucket/path`` reference."""
    from datetime import timedelta

    from firebase_admin import storage

    if not storage_reference.startswith("gs://"):
        return storage_reference
    initialize_firebase()
    without_scheme = storage_reference[len("gs://"):]
    bucket_name, _, object_path = without_scheme.partition("/")
    bucket = storage.bucket(bucket_name)
    blob = bucket.blob(object_path)
    try:
        return blob.generate_signed_url(expiration=timedelta(minutes=expiry_minutes), version="v4", method="GET")
    except Exception:
        return None


def next_sequence(counter_name: str, start: int = 1) -> int:
    """Atomically increment and return a named counter in the Realtime Database."""
    ref = get_db_reference(f"/counters/{counter_name}")

    def _increment(current):
        return (current or start - 1) + 1

    return ref.transaction(_increment)


def multi_location_update(updates: dict) -> None:
    """Atomically write to multiple Realtime Database paths in one operation.

    ``updates`` maps absolute paths (e.g. "registrations/AGG-004") to values.
    RTDB applies all writes atomically - they all succeed or all fail.
    """
    get_db_reference("/").update(updates)
