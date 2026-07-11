"""scan_request_service.py — /scan_requests lifecycle (§2.6).

The real-time scan flow (PENDING → SCANNING → COMPLETE) stays on
Firebase listeners between the dashboard and the TAPU device — the
backend only owns the terminal operations:

- archive: copy to /scan_request_log then delete (never bare-delete)
- expire:  mark EXPIRED then archive (65s dashboard-side safety net)
- delete:  remove a cancelled request without archival noise

In demo mode (no Firebase) these are safe no-ops since scan requests
only exist when a physical device bridge is connected.
"""

from __future__ import annotations

from backend.firebase import get_db_reference, get_service_mode, multi_location_update


def archive_scan_request(session_id: str) -> bool:
    if get_service_mode() != "firebase":
        return False
    snapshot = get_db_reference(f"/scan_requests/{session_id}").get()
    if not snapshot:
        return False
    multi_location_update({
        f"scan_request_log/{session_id}": snapshot,
        f"scan_requests/{session_id}": None,
    })
    return True


def expire_scan_request(session_id: str) -> bool:
    if get_service_mode() != "firebase":
        return False
    ref = get_db_reference(f"/scan_requests/{session_id}")
    if ref.get():
        ref.update({"status": "EXPIRED"})
    return archive_scan_request(session_id)


def delete_scan_request(session_id: str) -> bool:
    if get_service_mode() != "firebase":
        return False
    get_db_reference(f"/scan_requests/{session_id}").delete()
    return True
