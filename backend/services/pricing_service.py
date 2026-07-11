"""pricing_service.py — /pricing/current + /pricing/changelog (§3.4).

CEO-only updates (enforced at the route). Every change appends a
changelog entry alongside the current-pricing update.
"""

from __future__ import annotations

import time
from uuid import uuid4

from fastapi import HTTPException

from backend.firebase import get_db_reference, get_service_mode, multi_location_update

# Demo-mode fallback store (mirrors the seeded RTDB defaults).
_demo_pricing: dict = {
    "current": {
        "current_season": "glut",
        "scarcity_rate": 1500,
        "glut_rate": 875,
        "active_rate": 875,
        "crate_deposit": 500,
        "card_fee": 1000,
    },
    "changelog": {},
}

_VALID_SEASONS = {"glut", "scarcity"}


def get_pricing() -> dict:
    if get_service_mode() == "firebase":
        return get_db_reference("/pricing/current").get() or {}
    return dict(_demo_pricing["current"])


def update_pricing(active_rate: float, season: str, actor_id: str) -> dict:
    season = (season or "").strip().lower()
    if season not in _VALID_SEASONS:
        raise HTTPException(status_code=400, detail=f"Season must be one of {sorted(_VALID_SEASONS)}")
    try:
        rate = float(active_rate)
    except (TypeError, ValueError):
        raise HTTPException(status_code=400, detail="Active rate must be numeric")
    if rate <= 0:
        raise HTTPException(status_code=400, detail="Active rate must be greater than zero")

    now_ms = int(time.time() * 1000)
    current = get_pricing()
    entry = {
        "timestamp": now_ms,
        "changed_by": actor_id,
        "old_rate": current.get("active_rate"),
        "new_rate": rate,
        "old_season": current.get("current_season"),
        "new_season": season,
    }

    if get_service_mode() == "firebase":
        multi_location_update({
            "pricing/current/active_rate": rate,
            "pricing/current/current_season": season,
            "pricing/current/last_updated": now_ms,
            "pricing/current/updated_by": actor_id,
            f"pricing/changelog/{uuid4().hex}": entry,
        })
        return get_pricing()

    _demo_pricing["current"].update({
        "active_rate": rate,
        "current_season": season,
        "last_updated": now_ms,
        "updated_by": actor_id,
    })
    _demo_pricing["changelog"][uuid4().hex] = entry
    return dict(_demo_pricing["current"])
