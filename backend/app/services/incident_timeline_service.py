from datetime import datetime

from app.db.storage import clear_user_snapshots, delete_snapshot
from app.models.emergency import EmergencyEvent
from app.models.incident_timeline import IncidentEventType, IncidentRiskLevel, IncidentTimelineEvent
from app.repositories.alert_repository import alert_repository
from app.repositories.emergency_repository import emergency_repository
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

    def create_from_emergency(self, user_id: str, event: EmergencyEvent, incident_id: str | None = None) -> IncidentTimelineEvent:
        if not incident_id:
            incident_id = event.id
            existing_status = emergency_repository.get_status(user_id, event.camera_id)
            if existing_status.active_event_id:
                incident_id = existing_status.active_event_id

        timeline_event = IncidentTimelineEvent(
            camera_id=event.camera_id,
            event_type=IncidentEventType.emergency_transition,
            title=f"{event.previous_state} -> {event.state}",
            description=event.message,
            risk_level=IncidentRiskLevel(event.risk_level.upper()),
            risk_score=event.risk_score,
            confidence=event.confidence,
            human_at_risk=event.human_at_risk,
            snapshot_url=event.snapshot_url,
            metadata={
                "emergencyEventId": event.id,
                "incidentId": incident_id,
                "previousState": event.previous_state,
                "state": event.state,
                "escalationCount": event.escalation_count,
            },
            created_at=event.created_at,
        )
        return self.repository.add(user_id, timeline_event)

    def delete_event(self, user_id: str, event_id: str) -> bool:
        event = self.repository.find(user_id, event_id)
        if event is None:
            return False

        self.repository.delete(user_id, event_id)
        emergency_event_id = event.metadata.get("emergencyEventId")
        snapshots_to_check = {event.snapshot_url} if event.snapshot_url else set()

        if isinstance(emergency_event_id, str) and not self.repository.has_emergency_reference(user_id, emergency_event_id):
            emergency_event = emergency_repository.find_event(user_id, emergency_event_id)
            if emergency_event and emergency_event.snapshot_url:
                snapshots_to_check.add(emergency_event.snapshot_url)
            emergency_repository.delete_event(user_id, emergency_event_id)
            emergency_repository.reset_status_for_event(user_id, emergency_event_id)
            alert_repository.delete_by_detection_ids(user_id, {emergency_event_id})

        for snapshot_url in snapshots_to_check:
            if not self._snapshot_is_referenced(user_id, snapshot_url):
                delete_snapshot(user_id, snapshot_url)
        return True

    def clear_all_events(self, user_id: str) -> None:
        emergency_event_ids = {event.id for event in emergency_repository.list_events(user_id)}
        self.repository.clear_all(user_id)
        emergency_repository.clear_events(user_id)
        emergency_repository.reset_all_statuses(user_id)
        alert_repository.delete_by_detection_ids(user_id, emergency_event_ids)
        clear_user_snapshots(user_id)

    def _snapshot_is_referenced(self, user_id: str, snapshot_url: str) -> bool:
        return (
            any(event.snapshot_url == snapshot_url for event in self.repository.list(user_id))
            or any(event.snapshot_url == snapshot_url for event in emergency_repository.list_events(user_id))
            or any(status.snapshot_url == snapshot_url for status in emergency_repository.list_statuses(user_id))
        )
