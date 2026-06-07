from __future__ import annotations

from statistics import mean

from backend.services.alert_service import list_alerts
from backend.services.sensor_service import list_sensor_readings
from backend.services.trial_service import list_trials
from backend.services.truck_service import list_trucks


def get_recommendations():
    trucks = list_trucks()
    trials = list_trials()
    readings = list_sensor_readings()
    alerts = list_alerts()

    hot_readings = [r for r in readings if float(r.get("humidity", 0) or 0) >= 70 or float(r.get("temperature", 0) or 0) >= 32]
    best_trial = max((t for t in trials if t.get("shelf_days")), key=lambda t: t.get("shelf_days", 0), default=None)
    high_alert_routes = {t.get("route", "unknown") for t in trucks if t.get("status") == "alert"}
    avg_temp = round(mean(float(t.get("sensors", {}).get("temp", 0) or 0) for t in trucks), 2) if trucks else 0

    recommendations = []
    if best_trial:
        recommendations.append({
            "insight": f"Best observed shelf life is {best_trial.get('shelf_days')} days in {best_trial.get('formula')}.",
            "recommendation": f"Use {best_trial.get('formula')} as baseline for stable routes and humid-route hardening.",
            "action": "Keep trial replication and compare against BS-v1.3.",
        })
    if hot_readings:
        recommendations.append({
            "insight": f"{len(hot_readings)} telemetry readings exceed humidity/temperature thresholds.",
            "recommendation": "Increase moisture barrier strength by raising cassava starch concentration for humid corridors.",
            "action": "Prioritize routes with repeated alerts.",
        })
    if high_alert_routes:
        recommendations.append({
            "insight": f"Alert activity concentrated on: {', '.join(sorted(high_alert_routes))}.",
            "recommendation": "Review pre-cooling, loading density, and dispatch timing on high-risk routes.",
            "action": "Ops escalation.",
        })
    if alerts:
        recommendations.append({
            "insight": f"{len([a for a in alerts if a.get('status', 'open') != 'resolved'])} open alert(s) remain.",
            "recommendation": f"Average fleet temperature is {avg_temp}°C; continue reducing peak exposure.",
            "action": "Monitor threshold analytics daily.",
        })

    return recommendations or [{
        "insight": "No strong anomalies detected.",
        "recommendation": "Continue monitoring and validate formulations against new shipments.",
        "action": "No immediate action required.",
    }]
