from datetime import datetime

from app.models.incident_timeline import IncidentEventType, IncidentRiskLevel, IncidentTimelineEvent


class IncidentTimelineRepository:
    def __init__(self) -> None:
        self._events: list[IncidentTimelineEvent] = []

    def list(
        self,
        camera_id: str | None = None,
        risk_level: IncidentRiskLevel | None = None,
        event_type: IncidentEventType | None = None,
        date_from: datetime | None = None,
        date_to: datetime | None = None,
    ) -> list[IncidentTimelineEvent]:
        events = self._events
        if camera_id:
            events = [event for event in events if event.camera_id == camera_id]
        if risk_level:
            events = [event for event in events if event.risk_level == risk_level]
        if event_type:
            events = [event for event in events if event.event_type == event_type]
        if date_from:
            events = [event for event in events if event.created_at >= date_from]
        if date_to:
            events = [event for event in events if event.created_at <= date_to]

        return sorted(events, key=lambda event: event.created_at, reverse=True)

    def add(self, event: IncidentTimelineEvent) -> IncidentTimelineEvent:
        self._events.append(event)
        return event


incident_timeline_repository = IncidentTimelineRepository()
