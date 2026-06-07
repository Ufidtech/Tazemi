from fastapi import APIRouter

from .routes import health, dashboard, trucks, batches, aggregators, trials, insights, auth, reports, notes, sensors, alerts, ingest, demo
from backend.data.demo_data import DEMO_DATA

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
api_router.include_router(demo.router, tags=["demo"])


@api_router.get("/activity", tags=["dashboard"])
def activity():
    return DEMO_DATA.get("activity", [])
