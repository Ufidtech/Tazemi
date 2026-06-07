from __future__ import annotations

from typing import Any

from backend.data.demo_data import DEMO_DATA
from backend.firebase import get_db_reference, get_service_mode, sync_demo_to_firebase


class Repository:
    def __init__(self, collection: str):
        self.collection = collection

    def _demo_items(self) -> list[dict[str, Any]]:
        return DEMO_DATA.setdefault(self.collection, [])

    def _firebase_ref(self):
        return get_db_reference(self.collection)

    def list(self):
        if get_service_mode() == "firebase":
            snapshot = self._firebase_ref().get() or {}
            return list(snapshot.values()) if isinstance(snapshot, dict) else snapshot
        return self._demo_items()

    def get(self, record_id: str):
        return next((item for item in self.list() if item.get("id") == record_id), None)

    def upsert(self, record: dict):
        if get_service_mode() == "firebase":
            self._firebase_ref().child(record["id"]).set(record)
        else:
            items = self._demo_items()
            items[:] = [item for item in items if item.get("id") != record["id"]] + [record]
        return record

    def delete(self, record_id: str):
        if get_service_mode() == "firebase":
            self._firebase_ref().child(record_id).delete()
            return True
        items = self._demo_items()
        before = len(items)
        items[:] = [item for item in items if item.get("id") != record_id]
        return len(items) < before

    def migrate_demo_to_firebase(self) -> int:
        if get_service_mode() == "firebase":
            items = self._demo_items()
            sync_demo_to_firebase(self.collection, items)
            return len(items)
        return 0
