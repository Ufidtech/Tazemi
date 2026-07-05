"""Manage Firebase staff users and their roles.

Requires backend Firebase env to be configured (FIREBASE_DATABASE_URL plus a
service account via FIREBASE_SERVICE_ACCOUNT_JSON, FIREBASE_CREDENTIALS_JSON, or
GOOGLE_APPLICATION_CREDENTIALS).

Examples (run from the repo root):
    python -m backend.scripts.manage_users create-user \
        --email ceo@tazemi.com --password "StrongPass!23" --name "Tazemi CEO" --role ceo
    python -m backend.scripts.manage_users set-role --email ceo@tazemi.com --role ceo
    python -m backend.scripts.manage_users get --email ceo@tazemi.com
"""
from __future__ import annotations

import argparse
import sys

from firebase_admin import auth as firebase_auth

from backend.firebase import initialize_firebase
from backend.services import user_service

ALLOWED_ROLES = {"ceo", "field_operator", "admin", "read-only"}


def _apply_role(uid: str, role: str) -> None:
    firebase_auth.set_custom_user_claims(uid, {"role": role})


def create_user(email: str, password: str, name: str | None, role: str) -> None:
    user = firebase_auth.create_user(email=email, password=password, display_name=name or email.split("@")[0])
    _apply_role(user.uid, role)
    user_service.find_or_create_user({"uid": user.uid, "email": email, "name": name, "provider": "firebase"}, role)
    user_service.set_role(user.uid, role)
    print(f"Created user {email} (uid={user.uid}) with role={role}")


def set_role(email: str | None, uid: str | None, role: str) -> None:
    if not uid:
        user = firebase_auth.get_user_by_email(email)
        uid = user.uid
        email = user.email
    _apply_role(uid, role)
    # Keep the user DB (source of truth for role) in sync.
    if not user_service.set_role(uid, role):
        user_service.find_or_create_user({"uid": uid, "email": email, "provider": "firebase"}, role)
        user_service.set_role(uid, role)
    print(f"Set role={role} for uid={uid}")


def get_user(email: str | None, uid: str | None) -> None:
    user = firebase_auth.get_user(uid) if uid else firebase_auth.get_user_by_email(email)
    print(f"uid={user.uid} email={user.email} claims={user.custom_claims or {}}")


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description="Manage Firebase staff users.")
    sub = parser.add_subparsers(dest="command", required=True)

    c = sub.add_parser("create-user", help="Create a Firebase user and assign a role.")
    c.add_argument("--email", required=True)
    c.add_argument("--password", required=True)
    c.add_argument("--name")
    c.add_argument("--role", required=True, choices=sorted(ALLOWED_ROLES))

    s = sub.add_parser("set-role", help="Set the role custom claim for an existing user.")
    s.add_argument("--email")
    s.add_argument("--uid")
    s.add_argument("--role", required=True, choices=sorted(ALLOWED_ROLES))

    g = sub.add_parser("get", help="Show a user's uid, email and claims.")
    g.add_argument("--email")
    g.add_argument("--uid")

    args = parser.parse_args(argv)
    initialize_firebase()

    if args.command == "create-user":
        create_user(args.email, args.password, args.name, args.role)
    elif args.command == "set-role":
        if not args.email and not args.uid:
            parser.error("set-role requires --email or --uid")
        set_role(args.email, args.uid, args.role)
    elif args.command == "get":
        if not args.email and not args.uid:
            parser.error("get requires --email or --uid")
        get_user(args.email, args.uid)
    return 0


if __name__ == "__main__":
    sys.exit(main())
