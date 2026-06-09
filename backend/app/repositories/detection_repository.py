from __future__ import annotations

from app.db.firestore import get_firestore_client, get_user_collection, with_expiration
from app.models.detection import DetectionEvent


class DetectionRepository:
    collection_name = "detections"

    def list(self, user_id: str) -> list[DetectionEvent]:
        events = [
            DetectionEvent.model_validate(document.to_dict())
            for document in get_user_collection(user_id, self.collection_name).stream()
        ]
        return sorted(events, key=lambda event: event.created_at, reverse=True)

    def add_many(self, user_id: str, events: list[DetectionEvent]) -> list[DetectionEvent]:
        if not events:
            return events

        collection = get_user_collection(user_id, self.collection_name)
        batch = get_firestore_client().batch()
        for event in events:
            batch.set(collection.document(event.id), with_expiration(event.model_dump(mode="python")))
        batch.commit()
        return events


detection_repository = DetectionRepository()
