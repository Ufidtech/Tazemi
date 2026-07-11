from __future__ import annotations

import re
import threading
from datetime import datetime, timezone
from pathlib import Path
from uuid import uuid4

from fastapi import HTTPException

from backend.firebase import get_db_reference, get_service_mode, multi_location_update, upload_bytes_to_storage
from backend.services.crypto import encrypt_sensitive, hash_sensitive
from backend.services.repository import Repository
from backend.data.demo_data import DEMO_DATA

CARD_FEE = 1000
MIN_TOPUP = 5000
MIN_TOPUP_AMOUNT = 1000

_registrations = Repository("registrations")
_aggregators = Repository("aggregators")
_transactions = Repository("transactions")

_id_lock = threading.Lock()

_UPLOAD_DIR = Path(__file__).resolve().parent.parent / "uploads"

_ALLOWED_PHOTO_TYPES = {"image/jpeg", "image/png", "image/webp"}
_MAX_PHOTO_BYTES = 5 * 1024 * 1024  # 5 MB

# Fields that must never be returned to clients.
_SENSITIVE_FIELDS = {"nin_or_bvn_encrypted", "nin_hash"}


def _now() -> str:
    return datetime.now(timezone.utc).isoformat()


def public_view(record: dict) -> dict:
    """Strip sensitive fields before returning a registration to clients."""
    return {k: v for k, v in record.items() if k not in _SENSITIVE_FIELDS}


def display_view(record: dict) -> dict:
    """Map a registration to the shape the frontend aggregator directory expects.

    Provides safe defaults for the demo-style fields the UI renders, while
    carrying the registration-specific fields (balance, rfid_uid, phone). Never
    includes sensitive fields.
    """
    created = record.get("created_at", "") or record.get("registered_at", "") or ""
    account_status = record.get("account_status") or (record.get("status") or "active").upper()
    return {
        "id": record.get("id"),
        "name": record.get("full_name"),
        "location": record.get("market_location"),
        "contact": record.get("phone_number"),
        "status": account_status.lower(),
        "account_status": account_status,
        "joined": created[:10] if created else "",
        "batches": record.get("total_batches", 0),
        "total_batches": record.get("total_batches", 0),
        "total_crates_coated": record.get("total_crates_coated", 0),
        "crates": record.get("total_crates_coated", 0),
        "spoilage_rate": 0,
        "revenue": 0,
        "trucks": 0,
        "balance": record.get("balance", 0),
        "card_fee_paid": record.get("card_fee_paid", True),
        "rfid_uid": record.get("rfid_uid"),
        "phone_number": record.get("phone_number"),
        "market_location": record.get("market_location"),
        "photo_url": record.get("photo_url"),
        "registered_at": record.get("registered_at") or created,
        "registered_by": record.get("registered_by") or record.get("created_by"),
        "created_at": created,
        "created_by": record.get("created_by"),
        "updated_at": record.get("updated_at"),
        "source": "registration",
    }


# --------------------------------------------------------------------------- #
# Validation helpers
# --------------------------------------------------------------------------- #
def normalize_phone(phone: str) -> str:
    """Normalise a Nigerian phone number to E.164 (+234XXXXXXXXXX)."""
    digits = re.sub(r"\D", "", phone or "")
    if digits.startswith("234"):
        national = digits[3:]
    elif digits.startswith("0"):
        national = digits[1:]
    else:
        national = digits
    if len(national) != 10 or national[0] not in "789":
        raise HTTPException(status_code=400, detail="Phone number is not a valid Nigerian number")
    return f"+234{national}"


def _validate_and_clean(fields: dict) -> dict:
    full_name = (fields.get("full_name") or "").strip()
    if len(full_name) < 3:
        raise HTTPException(status_code=400, detail="Full name must be at least 3 characters")

    phone = normalize_phone(fields.get("phone_number") or "")

    # Optional (NewTazemi spec) — the dashboard registers with only
    # name/phone/photo/RFID. PRD v2.1 clients may still send these.
    market_location = (fields.get("market_location") or "").strip()

    nin_or_bvn = re.sub(r"\D", "", fields.get("nin_or_bvn") or "")
    if nin_or_bvn and len(nin_or_bvn) != 11:
        raise HTTPException(status_code=400, detail="NIN or BVN must be exactly 11 digits")

    rfid_uid = (fields.get("rfid_uid") or "").strip().upper()
    if not re.fullmatch(r"[0-9A-F]{8}", rfid_uid):
        raise HTTPException(status_code=400, detail="RFID UID must be exactly 8 uppercase hex characters")

    created_by = (fields.get("created_by") or "").strip()
    if not created_by:
        raise HTTPException(status_code=400, detail="created_by is required")

    raw_topup = fields.get("initial_topup")
    if raw_topup in (None, ""):
        initial_topup = 0.0
    else:
        try:
            initial_topup = float(raw_topup)
        except (TypeError, ValueError):
            raise HTTPException(status_code=400, detail="Initial top-up must be numeric")
    if initial_topup and initial_topup < MIN_TOPUP:
        raise HTTPException(status_code=400, detail=f"Initial top-up must be at least {MIN_TOPUP}")

    return {
        "full_name": full_name,
        "phone_number": phone,
        "market_location": market_location,
        "nin_or_bvn": nin_or_bvn,
        "rfid_uid": rfid_uid,
        "created_by": created_by,
        "initial_topup": initial_topup,
    }


def _assert_unique(clean: dict) -> None:
    existing = _registrations.list()
    if any(item.get("rfid_uid") == clean["rfid_uid"] for item in existing):
        raise HTTPException(status_code=409, detail="RFID UID already exists")
    if any(item.get("phone_number") == clean["phone_number"] for item in existing):
        raise HTTPException(status_code=409, detail="Aggregator already exists")
    if clean["nin_or_bvn"]:
        nin_hash = hash_sensitive(clean["nin_or_bvn"])
        if any(item.get("nin_hash") == nin_hash for item in existing):
            raise HTTPException(status_code=409, detail="Aggregator already exists")


# --------------------------------------------------------------------------- #
# ID generation
# --------------------------------------------------------------------------- #
def _scan_highest_id() -> int:
    pattern = re.compile(r"AGG-(\d+)")
    highest = 0
    collections = (_aggregators.list(), _registrations.list(), DEMO_DATA.get("aggregators", []))
    for collection in collections:
        for item in collection:
            match = pattern.fullmatch(str(item.get("id", "")))
            if match:
                highest = max(highest, int(match.group(1)))
    return highest


def _next_aggregator_id() -> str:
    if get_service_mode() == "firebase":
        existing_max = _scan_highest_id()

        def _increment(current):
            return max(current or 0, existing_max) + 1

        number = get_db_reference("/counters/aggregator_seq").transaction(_increment)
        return f"AGG-{number:03d}"
    return f"AGG-{_scan_highest_id() + 1:03d}"


# --------------------------------------------------------------------------- #
# Photo storage
# --------------------------------------------------------------------------- #
def _store_photo(aggregator_id: str, filename: str, content: bytes, content_type: str | None) -> str:
    if content_type and content_type not in _ALLOWED_PHOTO_TYPES:
        raise HTTPException(status_code=400, detail="Photo must be a JPEG, PNG, or WebP image")
    if len(content) > _MAX_PHOTO_BYTES:
        raise HTTPException(status_code=400, detail="Photo exceeds the 5 MB size limit")

    ext = Path(filename or "").suffix or ".jpg"
    object_name = f"aggregators/{aggregator_id}/{uuid4().hex}{ext}"

    if get_service_mode() == "firebase":
        try:
            return upload_bytes_to_storage(object_name, content, content_type)
        except Exception as exc:  # noqa: BLE001 - degrade gracefully
            # Firebase Storage may not be provisioned; fall back to local disk
            # so registration still succeeds. Enable Storage to use the cloud.
            print(f"[registration] Firebase Storage upload failed ({exc}); using local storage")

    # Demo / local fallback: persist to disk.
    target = _UPLOAD_DIR / object_name
    target.parent.mkdir(parents=True, exist_ok=True)
    target.write_bytes(content)
    return f"/uploads/{object_name}"


# --------------------------------------------------------------------------- #
# Public API
# --------------------------------------------------------------------------- #
def register_aggregator(fields: dict, photo_filename: str, photo_bytes: bytes, photo_content_type: str | None) -> dict:
    if not photo_bytes:
        raise HTTPException(status_code=400, detail="Photo is required")

    clean = _validate_and_clean(fields)

    with _id_lock:
        _assert_unique(clean)
        aggregator_id = _next_aggregator_id()

        photo_url = _store_photo(aggregator_id, photo_filename, photo_bytes, photo_content_type)

        initial_topup = clean["initial_topup"]
        has_topup = initial_topup > 0
        # Without an initial top-up (NewTazemi minimal registration) the
        # card fee stays due — topup_aggregator deducts it from the first
        # top-up (card_fee_paid=False path).
        balance = initial_topup - CARD_FEE if has_topup else 0.0
        timestamp = _now()

        record = {
            "id": aggregator_id,
            "full_name": clean["full_name"],
            "phone_number": clean["phone_number"],
            "market_location": clean["market_location"],
            "nin_or_bvn_encrypted": encrypt_sensitive(clean["nin_or_bvn"]) if clean["nin_or_bvn"] else None,
            "nin_hash": hash_sensitive(clean["nin_or_bvn"]) if clean["nin_or_bvn"] else None,
            "photo_url": photo_url,
            "rfid_uid": clean["rfid_uid"],
            "balance": balance,
            "account_status": "ACTIVE",
            "card_fee_paid": has_topup,
            "total_batches": 0,
            "total_crates_coated": 0,
            "registered_by": clean["created_by"],
            "registered_at": timestamp,
            # kept for backwards compatibility with earlier consumers
            "status": "active",
            "created_by": clean["created_by"],
            "created_at": timestamp,
            "updated_at": timestamp,
        }

        transactions = []
        if has_topup:
            transactions.append({
                "id": uuid4().hex,
                "transaction_id": uuid4().hex,
                "aggregator_id": aggregator_id,
                "type": "TOPUP",
                "amount": initial_topup,
                "balance_before": 0,
                "balance_after": initial_topup,
                "created_by": clean["created_by"],
                "created_at": timestamp,
                "metadata": {"source": "registration"},
            })
            transactions.append({
                "id": uuid4().hex,
                "transaction_id": uuid4().hex,
                "aggregator_id": aggregator_id,
                "type": "CARD_FEE",
                "amount": CARD_FEE,
                "balance_before": initial_topup,
                "balance_after": balance,
                "created_by": clean["created_by"],
                "created_at": timestamp,
                "metadata": {"source": "registration"},
            })

        _write_records_atomically(record, transactions)

    return {
        "id": aggregator_id,
        "name": clean["full_name"],
        "balance": balance,
        "rfid_uid": clean["rfid_uid"],
        "phoneNumber": clean["phone_number"],
        "marketLocation": clean["market_location"],
        "registered_at": timestamp,
    }


def _write_records_atomically(aggregator: dict, transactions: list[dict]) -> None:
    """Persist the aggregator and its transactions atomically.

    In Firebase mode all paths are written in a single multi-location update
    (all-or-nothing). In demo mode writes happen under the module lock, with a
    rollback of any partial writes on failure.
    """
    if get_service_mode() == "firebase":
        updates = {f"registrations/{aggregator['id']}": aggregator}
        for txn in transactions:
            updates[f"transactions/{txn['id']}"] = txn
        try:
            multi_location_update(updates)
        except Exception as exc:
            raise HTTPException(status_code=500, detail="Failed to persist registration records") from exc
        return

    written: list[tuple[Repository, str]] = []
    try:
        _registrations.upsert(aggregator)
        written.append((_registrations, aggregator["id"]))
        for txn in transactions:
            _transactions.upsert(txn)
            written.append((_transactions, txn["id"]))
    except Exception as exc:
        for repo, record_id in reversed(written):
            try:
                repo.delete(record_id)
            except Exception:
                pass
        raise HTTPException(status_code=500, detail="Failed to persist registration records") from exc


def list_registrations() -> list[dict]:
    return [display_view(item) for item in _registrations.list()]


def get_registration(aggregator_id: str) -> dict | None:
    record = _registrations.get(aggregator_id)
    return display_view(record) if record else None


_MUTABLE_FIELDS = {"full_name", "phone_number", "market_location", "status"}


def update_registration(aggregator_id: str, fields: dict) -> dict | None:
    """Update mutable fields of a registered aggregator (RFID/NIN are immutable)."""
    with _id_lock:
        record = _registrations.get(aggregator_id)
        if not record:
            return None

        updates: dict = {}
        for key in _MUTABLE_FIELDS:
            if key in fields and fields[key] is not None:
                updates[key] = fields[key]

        if "full_name" in updates and len(str(updates["full_name"]).strip()) < 3:
            raise HTTPException(status_code=400, detail="Full name must be at least 3 characters")
        if "market_location" in updates and not str(updates["market_location"]).strip():
            raise HTTPException(status_code=400, detail="Market location is required")
        if "phone_number" in updates:
            updates["phone_number"] = normalize_phone(updates["phone_number"])

        updated = {**record, **updates, "updated_at": _now()}
        _registrations.upsert(updated)
        return display_view(updated)


def list_transactions(aggregator_id: str | None = None) -> list[dict]:
    items = _transactions.list()
    if aggregator_id:
        items = [item for item in items if item.get("aggregator_id") == aggregator_id]
    return sorted(items, key=lambda item: item.get("created_at", ""))


def topup_aggregator(aggregator_id: str, amount: float, created_by: str, method: str = "cash", note: str = "") -> dict:
    try:
        amount = float(amount)
    except (TypeError, ValueError):
        raise HTTPException(status_code=400, detail="Top-up amount must be numeric")
    if amount < MIN_TOPUP_AMOUNT:
        raise HTTPException(status_code=400, detail=f"Top-up amount must be at least {MIN_TOPUP_AMOUNT}")

    method = (method or "cash").strip().lower()
    if method not in {"cash", "bank_transfer", "bank transfer", "transfer"}:
        raise HTTPException(status_code=400, detail="Payment method must be Cash or Bank Transfer")
    method = "cash" if method == "cash" else "bank_transfer"

    with _id_lock:
        record = _registrations.get(aggregator_id)
        if not record:
            raise HTTPException(status_code=404, detail="Aggregator not found")

        timestamp = _now()
        transactions: list[dict] = []
        balance = float(record.get("balance", 0) or 0)

        topup_before = balance
        balance += amount
        transactions.append({
            "id": uuid4().hex,
            "transaction_id": uuid4().hex,
            "aggregator_id": aggregator_id,
            "type": "TOPUP",
            "amount": amount,
            "balance_before": topup_before,
            "balance_after": balance,
            "method": method,
            "note": note or "",
            "created_by": created_by,
            "created_at": timestamp,
            "metadata": {"source": "topup"},
        })

        # The first top-up pays the one-time card fee.
        if not record.get("card_fee_paid", False):
            fee_before = balance
            balance -= CARD_FEE
            transactions.append({
                "id": uuid4().hex,
                "transaction_id": uuid4().hex,
                "aggregator_id": aggregator_id,
                "type": "CARD_FEE",
                "amount": CARD_FEE,
                "balance_before": fee_before,
                "balance_after": balance,
                "method": method,
                "note": "Card fee deducted from first top-up",
                "created_by": created_by,
                "created_at": timestamp,
                "metadata": {"source": "topup"},
            })

        updated = {**record, "balance": balance, "card_fee_paid": True, "updated_at": timestamp}
        _registrations.upsert(updated)
        try:
            for txn in transactions:
                _transactions.upsert(txn)
        except Exception as exc:
            _registrations.upsert(record)  # revert
            raise HTTPException(status_code=500, detail="Failed to record top-up") from exc

    return {"aggregator": display_view(updated), "transactions": transactions}


# --------------------------------------------------------------------------- #
# Availability checks (§2.8 — advisory; uniqueness enforced at write time)
# --------------------------------------------------------------------------- #
def is_phone_available(phone: str) -> bool:
    normalized = normalize_phone(phone)
    records = _registrations.list() + _aggregators.list()
    return not any(item.get("phone_number") == normalized for item in records)


def is_rfid_available(rfid_uid: str) -> bool:
    uid = (rfid_uid or "").strip().upper()
    records = _registrations.list() + _aggregators.list()
    return not any(item.get("rfid_uid") == uid for item in records)


# --------------------------------------------------------------------------- #
# Card replacement (§3.2 — fee deducted, aborts if balance < fee)
# --------------------------------------------------------------------------- #
def replace_card(aggregator_id: str, new_uid: str, created_by: str) -> dict:
    uid = (new_uid or "").strip().upper()
    if not re.fullmatch(r"[0-9A-F]{8}", uid):
        raise HTTPException(status_code=400, detail="RFID UID must be exactly 8 uppercase hex characters")
    if not is_rfid_available(uid):
        raise HTTPException(status_code=409, detail="This RFID card is already assigned to another aggregator")

    with _id_lock:
        record = _registrations.get(aggregator_id)
        if not record:
            raise HTTPException(status_code=404, detail="Aggregator not found")

        balance = float(record.get("balance", 0) or 0)
        if balance < CARD_FEE:
            raise HTTPException(
                status_code=409,
                detail=f"Insufficient balance for card replacement fee ({CARD_FEE}). Collect cash and top up first.",
            )

        old_uid = record.get("rfid_uid")
        timestamp = _now()
        new_balance = balance - CARD_FEE

        fee_txn = {
            "id": uuid4().hex,
            "transaction_id": uuid4().hex,
            "aggregator_id": aggregator_id,
            "type": "CARD_FEE",
            "amount": CARD_FEE,
            "balance_before": balance,
            "balance_after": new_balance,
            "method": "cash",
            "note": f"Card replacement — old UID {old_uid}",
            "created_by": created_by,
            "created_at": timestamp,
            "metadata": {"source": "card_replacement", "old_uid": old_uid},
        }

        updated = {**record, "rfid_uid": uid, "balance": new_balance, "updated_at": timestamp}
        _registrations.upsert(updated)
        try:
            _transactions.upsert(fee_txn)
        except Exception as exc:
            _registrations.upsert(record)  # revert
            raise HTTPException(status_code=500, detail="Failed to record card replacement") from exc

        if get_service_mode() == "firebase":
            # Keep the RTDB rfid_index in sync for direct-DB consumers.
            try:
                multi_location_update({
                    f"rfid_index/{old_uid}": None,
                    f"rfid_index/{uid}": aggregator_id,
                })
            except Exception:
                pass  # index is advisory; registration record is authoritative

    return {"newUid": uid, "oldUid": old_uid, "aggregator": display_view(updated)}


# --------------------------------------------------------------------------- #
# Account status (§3.2 — CEO only, enforced at the route)
# --------------------------------------------------------------------------- #
_VALID_STATUSES = {"ACTIVE", "SUSPENDED", "INACTIVE"}


def set_account_status(aggregator_id: str, status: str, reason: str | None, actor_id: str) -> dict:
    status = (status or "").upper()
    if status not in _VALID_STATUSES:
        raise HTTPException(status_code=400, detail=f"Invalid account status: {status}")
    if status == "SUSPENDED" and not (reason or "").strip():
        raise HTTPException(status_code=400, detail="A reason is required to suspend an account")

    with _id_lock:
        record = _registrations.get(aggregator_id)
        if not record:
            raise HTTPException(status_code=404, detail="Aggregator not found")
        updated = {
            **record,
            "account_status": status,
            "status": status.lower(),
            "status_changed_at": _now(),
            "status_changed_by": actor_id,
            "status_reason": (reason or "").strip() or None,
            "updated_at": _now(),
        }
        _registrations.upsert(updated)
    return display_view(updated)


# --------------------------------------------------------------------------- #
# Refund (§3.2 — CEO only, atomic reverse write)
# --------------------------------------------------------------------------- #
def refund_transaction(original_txn_id: str, actor_id: str, reason: str) -> dict:
    if not (reason or "").strip():
        raise HTTPException(status_code=400, detail="A reason is required for refunds")

    with _id_lock:
        original = _transactions.get(original_txn_id) or next(
            (t for t in _transactions.list() if t.get("transaction_id") == original_txn_id), None
        )
        if not original:
            raise HTTPException(status_code=404, detail="Original transaction not found")

        aggregator_id = original.get("aggregator_id")
        record = _registrations.get(aggregator_id)
        if not record:
            raise HTTPException(status_code=404, detail="Aggregator not found")

        credit = abs(float(original.get("amount", 0) or 0))
        balance_before = float(record.get("balance", 0) or 0)
        balance_after = balance_before + credit
        timestamp = _now()

        refund_txn = {
            "id": uuid4().hex,
            "transaction_id": uuid4().hex,
            "aggregator_id": aggregator_id,
            "type": "REFUND",
            "amount": credit,
            "balance_before": balance_before,
            "balance_after": balance_after,
            "method": original.get("method", "cash"),
            "note": f"Refund of {original_txn_id}: {reason.strip()}",
            "created_by": actor_id,
            "created_at": timestamp,
            "metadata": {"source": "refund", "original_txn_id": original_txn_id},
        }

        updated = {**record, "balance": balance_after, "updated_at": timestamp}
        _registrations.upsert(updated)
        try:
            _transactions.upsert(refund_txn)
        except Exception as exc:
            _registrations.upsert(record)  # revert
            raise HTTPException(status_code=500, detail="Failed to record refund") from exc

    return {"refundTxnId": refund_txn["transaction_id"], "balanceAfter": balance_after}
