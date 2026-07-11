from fastapi import APIRouter, Body, Depends, HTTPException

from .routes import health, dashboard, trucks, batches, aggregators, trials, insights, auth, reports, notes, sensors, alerts, ingest, demo, crates, operators, pricing, scan_requests, settings
from backend.auth import audit_log, resolve_actor
from backend.data.demo_data import DEMO_DATA
from backend.services.registration_service import list_transactions, refund_transaction

api_router = APIRouter()

api_router.include_router(health.router, tags=["health"])
api_router.include_router(dashboard.router, prefix="/dashboard", tags=["dashboard"])
api_router.include_router(trucks.router, prefix="/trucks", tags=["trucks"])
api_router.include_router(batches.router, prefix="/batches", tags=["batches"])
api_router.include_router(aggregators.router, prefix="/aggregators", tags=["aggregators"])
api_router.include_router(trials.router, prefix="/trials", tags=["trials"])
api_router.include_router(insights.router, prefix="/insights", tags=["insights"])
api_router.include_router(auth.router, prefix="/auth", tags=["auth"])
api_router.include_router(reports.router, prefix="/reports", tags=["reports"])
api_router.include_router(notes.router, prefix="/notes", tags=["notes"])
api_router.include_router(ingest.router, prefix="/ingest", tags=["ingest"])
api_router.include_router(sensors.router, prefix="/sensor-readings", tags=["sensor-readings"])
api_router.include_router(alerts.router, prefix="/alerts", tags=["alerts"])
api_router.include_router(crates.router, prefix="/crates", tags=["crates"])
api_router.include_router(operators.router, prefix="/operators", tags=["operators"])
api_router.include_router(pricing.router, prefix="/pricing", tags=["pricing"])
api_router.include_router(scan_requests.router, prefix="/scan-requests", tags=["scan-requests"])
api_router.include_router(settings.router, prefix="/settings", tags=["settings"])
api_router.include_router(demo.router, tags=["demo"])


@api_router.get("/activity", tags=["dashboard"])
def activity():
    return DEMO_DATA.get("activity", [])


@api_router.get("/transactions", tags=["transactions"])
def transactions(aggregator_id: str | None = None):
    return list_transactions(aggregator_id)


@api_router.post("/transactions/{transaction_id}/refund", tags=["transactions"])
def refund(transaction_id: str, payload: dict = Body(default_factory=dict), user=Depends(resolve_actor)):
    if (user.get("role") or "").lower() != "ceo":
        raise HTTPException(status_code=403, detail="Only the CEO can issue refunds")
    result = refund_transaction(transaction_id, user.get("uid"), payload.get("reason"))
    audit_log("transaction.refund", user, "transactions", {"id": transaction_id})
    return result
