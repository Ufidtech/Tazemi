from __future__ import annotations

from backend.services.reporting_service import get_analytics_summary

def build_export_payload(format_name: str):
    summary = get_analytics_summary()
    return {
        "format": format_name.lower(),
        "content": summary,
    }
