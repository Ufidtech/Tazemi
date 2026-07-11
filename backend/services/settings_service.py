"""settings_service.py — hub name/location settings (NewTazemi Settings page).

Stored at /config/hub in the Realtime Database (CEO-write per DB rules),
with an in-memory fallback in demo mode.
"""

from __future__ import annotations

import time

from fastapi import HTTPException

from backend.firebase import get_db_reference, get_service_mode

_demo_hub: dict = {
    "hub_name": "Tazémi Kano Hub",
    "location": "Kano, Nigeria",
}


def get_hub_settings() -> dict:
    if get_service_mode() == "firebase":
        return get_db_reference("/config/hub").get() or dict(_demo_hub)
    return dict(_demo_hub)


def update_hub_settings(hub_name: str | None, location: str | None, actor_id: str) -> dict:
    updates: dict = {}
    if hub_name is not None:
        hub_name = str(hub_name).strip()
        if not hub_name:
            raise HTTPException(status_code=400, detail="Hub name must not be empty")
        updates["hub_name"] = hub_name
    if location is not None:
        location = str(location).strip()
        if not location:
            raise HTTPException(status_code=400, detail="Location must not be empty")
        updates["location"] = location
    if not updates:
        raise HTTPException(status_code=400, detail="Provide hub_name and/or location")

    updates["updated_at"] = int(time.time() * 1000)
    updates["updated_by"] = actor_id

    if get_service_mode() == "firebase":
        get_db_reference("/config/hub").update(updates)
        return get_hub_settings()

    _demo_hub.update(updates)
    return dict(_demo_hub)
