from fastapi import APIRouter, Depends, HTTPException

from backend.auth import audit_log, resolve_actor
from backend.models import CrateAssign, CrateCreate, CratePatch, CrateReturn
from backend.services.crate_service import (
    assign_crate,
    create_crate,
    dispatch_crate,
    get_crate,
    list_crates,
    return_crate,
    update_crate,
)

router = APIRouter()

STAFF_ROLES = {"ceo", "field_operator", "device"}


def _require_staff(user: dict):
    role = (user.get("role") or "").lower()
    if role not in STAFF_ROLES:
        raise HTTPException(status_code=403, detail="Insufficient role")
    return role


def _found_or_404(record, crate_id: str):
    if record is None:
        raise HTTPException(status_code=404, detail=f"Crate {crate_id} not found")
    return record


@router.get("")
def read_crates(status: str | None = None, aggregator_id: str | None = None):
    return list_crates(status=status, aggregator_id=aggregator_id)


@router.get("/{crate_id}")
def read_crate(crate_id: str):
    return _found_or_404(get_crate(crate_id), crate_id)


@router.post("")
def register_crate(payload: CrateCreate, user=Depends(resolve_actor)):
    _require_staff(user)
    record = create_crate(payload.grade, created_by=user.get("uid"))
    audit_log("crate.create", user, "crates", {"id": record["crate_id"]})
    return record


@router.patch("/{crate_id}")
def edit_crate(crate_id: str, payload: CratePatch, user=Depends(resolve_actor)):
    _require_staff(user)
    record = _found_or_404(update_crate(crate_id, payload.model_dump(exclude_unset=True)), crate_id)
    audit_log("crate.update", user, "crates", {"id": crate_id})
    return record


@router.post("/{crate_id}/assign")
def assign(crate_id: str, payload: CrateAssign, user=Depends(resolve_actor)):
    _require_staff(user)
    try:
        record = _found_or_404(assign_crate(crate_id, payload.aggregator_id, payload.batch_ref), crate_id)
    except ValueError as exc:
        raise HTTPException(status_code=409, detail=str(exc))
    audit_log("crate.assign", user, "crates", {"id": crate_id, "aggregator_id": payload.aggregator_id})
    return record


@router.post("/{crate_id}/dispatch")
def dispatch(crate_id: str, user=Depends(resolve_actor)):
    _require_staff(user)
    try:
        record = _found_or_404(dispatch_crate(crate_id), crate_id)
    except ValueError as exc:
        raise HTTPException(status_code=409, detail=str(exc))
    audit_log("crate.dispatch", user, "crates", {"id": crate_id})
    return record


@router.post("/{crate_id}/return")
def crate_return(crate_id: str, payload: CrateReturn, user=Depends(resolve_actor)):
    _require_staff(user)
    record = _found_or_404(return_crate(crate_id, payload.condition), crate_id)
    audit_log("crate.return", user, "crates", {"id": crate_id, "condition": payload.condition})
    return record
