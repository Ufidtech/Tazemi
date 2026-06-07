from __future__ import annotations

from collections import Counter, defaultdict
from datetime import datetime, timezone
from math import sqrt

from backend.data.demo_data import DEMO_DATA
from backend.firebase import get_db_reference, get_service_mode


def _log_source(label: str, path: str, live_items: list[dict], fallback_items: list[dict]) -> list[dict]:
    source = "firebase" if live_items else "demo_data"
    print(
        f"[dashboard_service] {label} source={source} path={path} live_count={len(live_items)} fallback_count={len(fallback_items)}"
    )
    return live_items if live_items else fallback_items


def _firebase_list(path: str) -> list[dict]:
    try:
        ref = get_db_reference(path)
        data = ref.get() or []
    except Exception:
        return []
    if isinstance(data, dict):
        return [value for value in data.values() if isinstance(value, dict)]
    return data if isinstance(data, list) else []


def _service_list(path: str, fallback: list[dict]) -> list[dict]:
    firebase_items = _firebase_list(path)
    return _log_source(path, path, firebase_items, fallback)



def _monthly_bucket_key(date_value: str) -> str:
    try:
        parsed = datetime.fromisoformat(str(date_value))
        return parsed.strftime("%b")
    except Exception:
        return str(date_value)[:3] if date_value else "Unknown"



def _crates_by_month_from_batches(batches: list[dict]) -> list[dict]:
    month_order = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]
    totals = defaultdict(int)
    for batch in batches:
        totals[_monthly_bucket_key(batch.get("date", ""))] += int(batch.get("crates", 0) or 0)
    return [{"month": month, "crates": totals.get(month, 0)} for month in month_order if month in totals]



def _crates_by_aggregator_from_batches(batches: list[dict]) -> list[dict]:
    totals = defaultdict(int)
    for batch in batches:
        name = batch.get("aggregator") or batch.get("aggregator_id") or "Unknown"
        totals[name] += int(batch.get("crates", 0) or 0)
    return [{"name": name, "value": crates} for name, crates in sorted(totals.items(), key=lambda item: item[1], reverse=True)]


def get_spoilage_trend():
    trials = _service_list("trials", DEMO_DATA.get("trials", []))
    print(f"[dashboard_service] computing spoilage_trend from {len(trials)} trials")
    by_formula = defaultdict(list)
    for trial in trials:
        if trial.get("shelf_days"):
            by_formula[trial.get("formula", "unknown")].append(float(trial["shelf_days"]))
    trend = [{"version": formula, "days": _safe_mean(days)} for formula, days in by_formula.items()]
    return sorted(trend, key=lambda row: row["days"])


def get_correlation_analysis():
    readings = _service_list("sensor_readings", DEMO_DATA.get("sensor_readings", []))
    print(f"[dashboard_service] computing correlation from {len(readings)} sensor readings")
    rows = []
    for reading in readings:
        rows.append({
            "truck": reading.get("truck_id") or reading.get("truck") or reading.get("id"),
            "temp": round(_temp_value(reading), 2),
            "humidity": round(_humidity_value(reading), 2),
            "spoilage": _spoilage_from_reading(reading),
        })
    return {
        "data": rows,
        "temp_correlation": _pearson([r["temp"] for r in rows], [r["spoilage"] for r in rows]),
        "humidity_correlation": _pearson([r["humidity"] for r in rows], [r["spoilage"] for r in rows]),
        "sample_size": len(rows),
    }


def get_alert_threshold_analytics():
    alerts = _service_list("alerts", DEMO_DATA.get("alerts", []))
    trucks = _service_list("trucks", DEMO_DATA.get("trucks", []))
    print(f"[dashboard_service] computing alert analytics from alerts={len(alerts)} trucks={len(trucks)}")
    truck_by_id = {truck.get("id"): truck for truck in trucks}
    return {
        "total_alerts": len(alerts),
        "open_alerts": len([a for a in alerts if a.get("status", "open") != "resolved"]),
        "by_type": dict(Counter(a.get("type", "unknown") for a in alerts)),
        "by_route": dict(Counter((truck_by_id.get(a.get("truck_id") or a.get("truck")) or {}).get("route", "unknown") for a in alerts)),
        "cooldown_minutes": 30,
    }


def get_kpi_aggregation():
    trucks = _service_list("trucks", DEMO_DATA.get("trucks", []))
    batches = _service_list("batches", DEMO_DATA.get("batches", []))
    aggregators = _service_list("aggregators", DEMO_DATA.get("aggregators", []))
    trials = _service_list("trials", DEMO_DATA.get("trials", []))
    alerts = _service_list("alerts", DEMO_DATA.get("alerts", []))
    print(
        f"[dashboard_service] computing kpis from trucks={len(trucks)} batches={len(batches)} aggregators={len(aggregators)} trials={len(trials)} alerts={len(alerts)}"
    )

    total_crates = sum(int(item.get("crates", 0) or 0) for item in batches)
    active_aggregators = len([item for item in aggregators if str(item.get("status", "")).lower() == "active"])
    active_trucks = len([item for item in trucks if str(item.get("status", "")).lower() in {"active", "in_transit", "alert"}])
    batches_month = len(batches)
    avg_spoilage_coated = _safe_mean([_spoilage_rate_from_truck(t) for t in trucks])
    avg_spoilage_uncoated = 43.0
    revenue_to_date = sum(int(item.get("revenue", 0) or 0) for item in aggregators)
    crates_by_month = _crates_by_month_from_batches(batches)
    crates_by_aggregator = _crates_by_aggregator_from_batches(batches)

    return {
        "total_crates_coated": total_crates,
        "total_crates": total_crates,
        "active_aggregators": active_aggregators,
        "active_iot_trucks": active_trucks,
        "active_trucks": active_trucks,
        "batches_this_month": batches_month,
        "batches_month": batches_month,
        "avg_spoilage_rate_coated": avg_spoilage_coated,
        "avg_spoilage_coated": avg_spoilage_coated,
        "avg_spoilage_uncoated": avg_spoilage_uncoated,
        "revenue_to_date": revenue_to_date,
        "revenue": revenue_to_date,
        "crates_by_month": crates_by_month,
        "crates_by_aggregator": crates_by_aggregator,
        "spoilage_trend": get_spoilage_trend(),
        "target_achieved_trials": len([t for t in trials if t.get("status") == "target_achieved"]),
    }


def get_formulation_recommendations():
    trials = _service_list("trials", DEMO_DATA.get("trials", []))
    print(f"[dashboard_service] computing recommendations from {len(trials)} trials")
    routes = get_route_analysis()
    correlation = get_correlation_analysis()
    best_trial = max((t for t in trials if t.get("shelf_days")), key=lambda t: t.get("shelf_days", 0), default=None)
    high_risk_route = next((route for route in routes if route["spoilage_rate"] >= 15), None)
    recommendations = []
    if best_trial:
        recommendations.append({"insight": f"Best observed shelf life is {best_trial.get('shelf_days')} days in {best_trial.get('formula')}.", "recommendation": f"Use {best_trial.get('formula')} as baseline for future optimization.", "action": "Replicate the winning formulation."})
    if correlation["humidity_correlation"] > correlation["temp_correlation"] and correlation["humidity_correlation"] > 0:
        recommendations.append({"insight": f"Humidity shows stronger relationship with spoilage (r={correlation['humidity_correlation']}).", "recommendation": "Increase moisture-barrier strength through higher starch concentration.", "action": "Prioritize humid corridors."})
    if high_risk_route:
        recommendations.append({"insight": f"{high_risk_route['route']} is the highest-risk route at {high_risk_route['spoilage_rate']}% spoilage.", "recommendation": "Apply tighter pre-cooling and dispatch controls on this corridor.", "action": "Escalate route review."})
    return recommendations or [{"insight": "No significant anomaly detected.", "recommendation": "Continue monitoring live records and validate the current formulation.", "action": "No action required."}]

from collections import Counter, defaultdict
from datetime import datetime, timezone
from math import sqrt

from backend.firebase import get_service_mode
from backend.services.alert_service import list_alerts
from backend.services.aggregator_service import list_aggregators
from backend.services.batch_service import list_batches
from backend.services.sensor_service import list_sensor_readings
from backend.services.trial_service import list_trials
from backend.services.truck_service import list_trucks


def _route_key(truck: dict) -> str:
    return truck.get("route", "unknown")


def _temp_value(record: dict) -> float:
    return float(record.get("sensors", {}).get("temp", record.get("temperature", 0)) or 0)


def _humidity_value(record: dict) -> float:
    return float(record.get("sensors", {}).get("humidity", record.get("humidity", 0)) or 0)


def _gas_value(record: dict) -> float:
    return float(record.get("sensors", {}).get("gas", record.get("gas_ppm", 0)) or 0)


def _vibration_value(record: dict) -> float:
    return float(record.get("sensors", {}).get("vibration", record.get("vibration_g", 0)) or 0)


def _spoilage_rate_from_truck(truck: dict) -> float:
    temp = _temp_value(truck)
    humidity = _humidity_value(truck)
    if truck.get("status") == "alert":
        return 35.0
    if temp >= 34 or humidity >= 75:
        return 18.0
    if temp >= 30 or humidity >= 68:
        return 12.0
    return 7.0


def _spoilage_from_reading(reading: dict) -> float:
    temp = _temp_value(reading)
    humidity = _humidity_value(reading)
    gas = _gas_value(reading)
    vibration = _vibration_value(reading)
    score = 5 + max(0.0, temp - 25) * 0.8 + max(0.0, humidity - 60) * 0.35 + max(0.0, gas - 250) / 120.0 + max(0.0, vibration - 1.0) * 8
    if temp >= 34 or humidity >= 75 or gas >= 1000 or vibration >= 2.5:
        score += 8
    return round(min(score, 45.0), 2)


def _safe_mean(values: list[float]) -> float:
    return round(sum(values) / len(values), 2) if values else 0.0


def _pearson(xs: list[float], ys: list[float]) -> float:
    if len(xs) < 2 or len(xs) != len(ys):
        return 0.0
    mean_x = sum(xs) / len(xs)
    mean_y = sum(ys) / len(ys)
    num = sum((x - mean_x) * (y - mean_y) for x, y in zip(xs, ys))
    den_x = sqrt(sum((x - mean_x) ** 2 for x in xs))
    den_y = sqrt(sum((y - mean_y) ** 2 for y in ys))
    return round(num / (den_x * den_y), 3) if den_x and den_y else 0.0


def get_dashboard_summary():
    print(f"[dashboard_service] building dashboard summary service_mode={get_service_mode()}")
    trials = _service_list("trials", DEMO_DATA.get("trials", []))
    sensor_readings = _service_list("sensor_readings", DEMO_DATA.get("sensor_readings", []))
    alerts = _service_list("alerts", DEMO_DATA.get("alerts", []))
    kpis = get_kpi_aggregation()

    return {
        "generated_at": datetime.now(timezone.utc).isoformat(),
        "dashboard_kpis": kpis,
        "dashboard_metrics": kpis,
        "route_summary": get_route_analysis(),
        "spoilage_trend": kpis.get("spoilage_trend", []),
        "threshold_analytics": get_alert_threshold_analytics(),
        "recommendations": get_formulation_recommendations(),
        "correlation": get_correlation_analysis(),
        "trial_statuses": dict(Counter(item.get("status", "unknown") for item in trials)),
        "sensor_readings": len(sensor_readings),
        "open_alerts": len([a for a in alerts if a.get("status", "open") != "resolved"]),
        "demo": get_service_mode() != "firebase",
    }


def get_route_analysis():
    trucks = _service_list("trucks", DEMO_DATA.get("trucks", []))
    print(f"[dashboard_service] computing route summary from {len(trucks)} trucks")
    grouped = defaultdict(list)
    for truck in trucks:
        grouped[_route_key(truck)].append(truck)
    route_rows = []
    for route, items in grouped.items():
        if not items:
            continue
        spoilage_rates = [_spoilage_rate_from_truck(item) for item in items]
        route_rows.append(
            {
                "route": route,
                "trips": len(items),
                "avg_temp": _safe_mean([_temp_value(item) for item in items]),
                "avg_humidity": _safe_mean([_humidity_value(item) for item in items]),
                "avg_duration": _safe_mean([float(item.get("duration_hours", item.get("duration", 0)) or 0) for item in items]),
                "spoilage_rate": _safe_mean(spoilage_rates),
                "alert_rate": round(len([item for item in items if str(item.get("status", "")).lower() == "alert"]) / len(items) * 100, 2),
                "status": "High Risk" if _safe_mean(spoilage_rates) >= 15 else "Normal",
            }
        )
    return sorted(route_rows, key=lambda row: row["spoilage_rate"], reverse=True)
