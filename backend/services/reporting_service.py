from __future__ import annotations

from collections import Counter, defaultdict
from datetime import datetime, timezone
from statistics import mean
from typing import Iterable

from backend.firebase import get_service_mode
from backend.services.alert_service import list_alerts
from backend.services.aggregator_service import list_aggregators
from backend.services.batch_service import list_batches
from backend.services.export_builder import build_csv, build_pdf, build_xlsx
from backend.services.sensor_service import list_sensor_readings
from backend.services.trial_service import list_trials
from backend.services.truck_service import list_trucks


def _all_records():
    return {
        "trucks": list_trucks(),
        "batches": list_batches(),
        "aggregators": list_aggregators(),
        "trials": list_trials(),
        "alerts": list_alerts(),
        "sensor_readings": list_sensor_readings(),
    }


def _status_counts(items: Iterable[dict]):
    return dict(Counter(item.get("status", "unknown") for item in items))


def _route_analysis(trucks):
    grouped = defaultdict(list)
    for truck in trucks:
        grouped[truck.get("route", "unknown")].append(truck)
    return [
        {
            "route": route,
            "trips": len(items),
            "avg_temp": round(mean(float(i.get("sensors", {}).get("temp", 0) or 0) for i in items), 2),
            "avg_humidity": round(mean(float(i.get("sensors", {}).get("humidity", 0) or 0) for i in items), 2),
            "spoilage_rate": round(mean(35.0 if i.get("status") == "alert" else 18.0 if float(i.get("sensors", {}).get("temp", 0) or 0) >= 34 else 12.0 if float(i.get("sensors", {}).get("temp", 0) or 0) >= 30 else 7.0 for i in items), 2),
        }
        for route, items in grouped.items()
        if items
    ]


def _correlation_analysis(trucks):
    return [
        {
            "truck": item.get("id"),
            "temp": float(item.get("sensors", {}).get("temp", 0) or 0),
            "humidity": float(item.get("sensors", {}).get("humidity", 0) or 0),
            "spoilage": 35 if item.get("status") == "alert" else 18 if float(item.get("sensors", {}).get("temp", 0) or 0) >= 34 else 8,
        }
        for item in trucks
    ]


def _formulation_recommendations(trials, sensor_readings):
    hot_routes = [r for r in sensor_readings if float(r.get("humidity", 0) or 0) >= 70 or float(r.get("temperature", 0) or 0) >= 32]
    best_trial = max((t for t in trials if t.get("shelf_days")), key=lambda t: t.get("shelf_days", 0), default=None)
    if not best_trial:
        return []
    return [
        {
            "insight": f"{len(hot_routes)} sensor readings exceed humidity/temperature thresholds.",
            "recommendation": f"Prefer {best_trial.get('formula')} for humid routes; consider increasing starch concentration if readings remain elevated.",
            "action": "Escalate to CTO/R&D review.",
        }
    ]


def get_analytics_summary():
    records = _all_records()
    trucks = records["trucks"]
    batches = records["batches"]
    aggregators = records["aggregators"]
    trials = records["trials"]
    alerts = records["alerts"]
    sensor_readings = records["sensor_readings"]

    temp_values = [float(item.get("sensors", {}).get("temp", 0) or 0) for item in trucks]
    humidity_values = [float(item.get("sensors", {}).get("humidity", 0) or 0) for item in trucks]

    return {
        "generated_at": datetime.now(timezone.utc).isoformat(),
        "counts": {"trucks": len(trucks), "batches": len(batches), "aggregators": len(aggregators), "trials": len(trials), "alerts": len(alerts), "sensor_readings": len(sensor_readings)},
        "by_status": {"trucks": _status_counts(trucks), "batches": _status_counts(batches), "aggregators": _status_counts(aggregators), "trials": _status_counts(trials), "alerts": _status_counts(alerts)},
        "financials": {"revenue_to_date": sum(item.get("revenue", 0) for item in aggregators), "total_crates": sum(item.get("crates", 0) for item in batches)},
        "kpis": {"avg_temp": round(mean(temp_values), 2) if temp_values else 0, "avg_humidity": round(mean(humidity_values), 2) if humidity_values else 0, "open_alerts": len([a for a in alerts if a.get("status", "open") != "resolved"]), "shelf_life_best": max((t.get("shelf_days", 0) or 0) for t in trials) if trials else 0},
        "route_analysis": _route_analysis(trucks),
        "correlation_analysis": _correlation_analysis(trucks),
        "formulation_recommendations": _formulation_recommendations(trials, sensor_readings),
    }


def get_operational_report():
    summary = get_analytics_summary()
    return {"summary": summary, "kpis": {"active_aggregators": summary["counts"]["aggregators"], "active_trucks": summary["counts"]["trucks"], "trial_programs": summary["counts"]["trials"], "open_alerts": summary["kpis"]["open_alerts"]}, "demo": get_service_mode() != "firebase"}


def build_export(format_name: str):
    summary = get_analytics_summary()
    lowered = format_name.lower()
    if lowered == "csv":
        return {"format": "csv", "content": build_csv(summary)}
    if lowered in {"xlsx", "excel"}:
        return {"format": "xlsx", "content": build_xlsx(summary)}
    if lowered == "pdf":
        return {"format": "pdf", "content": build_pdf(summary)}
    return {"format": format_name, "content": summary}
