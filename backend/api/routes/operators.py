from fastapi import APIRouter, Depends, HTTPException

from backend.auth import audit_log, resolve_actor
from backend.models import OperatorCreate, OperatorPatch, OperatorPinVerify
from backend.services.operator_service import (
    create_operator,
    delete_operator,
    get_operator,
    list_operators,
    update_operator,
    verify_operator_pin,
)

router = APIRouter()

STAFF_ROLES = {"ceo", "field_operator"}
ADMIN_ROLES = {"ceo"}


def _require_role(user: dict, allowed: set[str]):
    role = (user.get("role") or "").lower()
    if role not in allowed:
        raise HTTPException(status_code=403, detail="Insufficient role")
    return role


@router.get("")
def read_operators(user=Depends(resolve_actor)):
    _require_role(user, STAFF_ROLES)
    return list_operators()


@router.get("/{operator_id}")
def read_operator(operator_id: str, user=Depends(resolve_actor)):
    _require_role(user, STAFF_ROLES)
    record = get_operator(operator_id)
    if not record:
        raise HTTPException(status_code=404, detail=f"Operator {operator_id} not found")
    return record


@router.post("")
def add_operator(payload: OperatorCreate, user=Depends(resolve_actor)):
    _require_role(user, ADMIN_ROLES)
    record = create_operator(payload.name, payload.role, payload.pin, created_by=user.get("uid"))
    audit_log("operator.create", user, "operators", {"id": record["operator_id"]})
    return record


@router.patch("/{operator_id}")
def edit_operator(operator_id: str, payload: OperatorPatch, user=Depends(resolve_actor)):
    _require_role(user, ADMIN_ROLES)
    record = update_operator(operator_id, payload.model_dump(exclude_unset=True))
    if not record:
        raise HTTPException(status_code=404, detail=f"Operator {operator_id} not found")
    audit_log("operator.update", user, "operators", {"id": operator_id})
    return record


@router.delete("/{operator_id}")
def remove_operator(operator_id: str, user=Depends(resolve_actor)):
    _require_role(user, ADMIN_ROLES)
    if not delete_operator(operator_id):
        raise HTTPException(status_code=404, detail=f"Operator {operator_id} not found")
    audit_log("operator.delete", user, "operators", {"id": operator_id})
    return {"deleted": True}


@router.post("/{operator_id}/verify-pin")
def verify_pin(operator_id: str, payload: OperatorPinVerify):
    """PIN login for devices/kiosks — returns the operator on success."""
    operator = verify_operator_pin(operator_id, payload.pin)
    if not operator:
        # Same response for unknown operator and wrong PIN (no enumeration).
        raise HTTPException(status_code=401, detail="Invalid operator ID or PIN")
    audit_log("operator.pin_login", None, "operators", {"id": operator_id})
    return operator
