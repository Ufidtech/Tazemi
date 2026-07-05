from __future__ import annotations

import base64
import hashlib
import os

from cryptography.fernet import Fernet, InvalidToken

_DEV_FALLBACK_SECRET = "tazemi-dev-insecure-secret-change-me"


def _is_production() -> bool:
    return (os.getenv("APP_ENV") or os.getenv("ENVIRONMENT") or "").lower() in {"production", "prod"}


def _derive_fernet_key() -> bytes:
    """Resolve a Fernet key from the environment.

    Priority:
    1. AGG_ENCRYPTION_KEY  - a ready-to-use urlsafe base64 Fernet key.
    2. AGG_ENCRYPTION_SECRET / SECRET_KEY - any secret, hashed into a key.
    3. Dev fallback secret (NOT for production - hard fails in production).
    """
    raw_key = os.getenv("AGG_ENCRYPTION_KEY")
    if raw_key:
        return raw_key.encode("utf-8")

    secret = os.getenv("AGG_ENCRYPTION_SECRET") or os.getenv("SECRET_KEY")
    if secret:
        digest = hashlib.sha256(secret.encode("utf-8")).digest()
        return base64.urlsafe_b64encode(digest)

    if _is_production():
        raise RuntimeError(
            "AGG_ENCRYPTION_KEY or AGG_ENCRYPTION_SECRET must be set in production to encrypt sensitive data"
        )

    digest = hashlib.sha256(_DEV_FALLBACK_SECRET.encode("utf-8")).digest()
    return base64.urlsafe_b64encode(digest)


def _fernet() -> Fernet:
    return Fernet(_derive_fernet_key())


def encrypt_sensitive(value: str) -> str:
    """Encrypt a sensitive string (e.g. NIN/BVN) and return a token string."""
    return _fernet().encrypt(value.encode("utf-8")).decode("utf-8")


def decrypt_sensitive(token: str) -> str:
    """Decrypt a token produced by ``encrypt_sensitive``."""
    try:
        return _fernet().decrypt(token.encode("utf-8")).decode("utf-8")
    except InvalidToken as exc:  # pragma: no cover - defensive
        raise ValueError("Unable to decrypt value") from exc


def hash_sensitive(value: str) -> str:
    """Deterministic hash for duplicate detection without storing plaintext."""
    return hashlib.sha256(value.encode("utf-8")).hexdigest()
