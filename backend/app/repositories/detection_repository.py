from __future__ import annotations

from app.models.detection import DetectionEvent


class DetectionRepository:
    def __init__(self) -> None:
        self._events: list[DetectionEvent] = []

    def list(self) -> list[DetectionEvent]:
        return sorted(self._events, key=lambda event: event.created_at, reverse=True)

    def add_many(self, events: list[DetectionEvent]) -> list[DetectionEvent]:
        self._events.extend(events)
        return events


detection_repository = DetectionRepository()
