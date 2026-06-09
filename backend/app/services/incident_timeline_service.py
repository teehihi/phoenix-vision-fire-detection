from datetime import datetime

from app.models.emergency import EmergencyEvent
from app.models.incident_timeline import IncidentEventType, IncidentRiskLevel, IncidentTimelineEvent
from app.repositories.incident_timeline_repository import IncidentTimelineRepository
from app.schemas.incident_timeline import IncidentTimelineEventCreate


class IncidentTimelineService:
    def __init__(self, repository: IncidentTimelineRepository) -> None:
        self.repository = repository

    def list_events(
        self,
        user_id: str,
        camera_id: str | None = None,
        risk_level: IncidentRiskLevel | None = None,
        event_type: IncidentEventType | None = None,
        date_from: datetime | None = None,
        date_to: datetime | None = None,
    ) -> list[IncidentTimelineEvent]:
        return self.repository.list(
            user_id=user_id,
            camera_id=camera_id,
            risk_level=risk_level,
            event_type=event_type,
            date_from=date_from,
            date_to=date_to,
        )

    def create_event(self, user_id: str, payload: IncidentTimelineEventCreate) -> IncidentTimelineEvent:
        event = IncidentTimelineEvent(
            camera_id=payload.camera_id,
            event_type=payload.event_type,
            title=payload.title,
            description=payload.description,
            risk_level=payload.risk_level,
            confidence=payload.confidence,
            risk_score=payload.risk_score,
            fire_area_ratio=payload.fire_area_ratio,
            smoke_area_ratio=payload.smoke_area_ratio,
            human_at_risk=payload.human_at_risk,
            humans_nearby_count=payload.humans_nearby_count,
            snapshot_url=payload.snapshot_url,
            metadata=payload.metadata,
        )
        return self.repository.add(user_id, event)

    def create_from_emergency(self, user_id: str, event: EmergencyEvent) -> IncidentTimelineEvent:
        timeline_event = IncidentTimelineEvent(
            camera_id=event.camera_id,
            event_type=IncidentEventType.emergency_transition,
            title=f"{event.previous_state} -> {event.state}",
            description=event.message,
            risk_level=IncidentRiskLevel(event.risk_level.upper()),
            risk_score=event.risk_score,
            human_at_risk=event.human_at_risk,
            snapshot_url=event.snapshot_url,
            metadata={
                "emergencyEventId": event.id,
                "previousState": event.previous_state,
                "state": event.state,
                "escalationCount": event.escalation_count,
            },
            created_at=event.created_at,
        )
        return self.repository.add(user_id, timeline_event)

    def delete_event(self, user_id: str, event_id: str) -> bool:
        return self.repository.delete(user_id, event_id)

    def clear_all_events(self, user_id: str) -> None:
        self.repository.clear_all(user_id)
