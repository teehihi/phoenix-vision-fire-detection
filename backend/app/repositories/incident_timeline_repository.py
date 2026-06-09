from datetime import datetime

from app.db.firestore import delete_collection, get_user_collection, with_expiration
from app.models.incident_timeline import IncidentEventType, IncidentRiskLevel, IncidentTimelineEvent


class IncidentTimelineRepository:
    collection_name = "incidentTimeline"

    def list(
        self,
        user_id: str,
        camera_id: str | None = None,
        risk_level: IncidentRiskLevel | None = None,
        event_type: IncidentEventType | None = None,
        date_from: datetime | None = None,
        date_to: datetime | None = None,
    ) -> list[IncidentTimelineEvent]:
        events = [
            IncidentTimelineEvent.model_validate(document.to_dict())
            for document in get_user_collection(user_id, self.collection_name).stream()
        ]
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

    def add(self, user_id: str, event: IncidentTimelineEvent) -> IncidentTimelineEvent:
        data = with_expiration(event.model_dump(mode="python"))
        get_user_collection(user_id, self.collection_name).document(event.id).set(data)
        return event

    def find(self, user_id: str, event_id: str) -> IncidentTimelineEvent | None:
        snapshot = get_user_collection(user_id, self.collection_name).document(event_id).get()
        return IncidentTimelineEvent.model_validate(snapshot.to_dict()) if snapshot.exists else None

    def has_emergency_reference(self, user_id: str, emergency_event_id: str) -> bool:
        return any(
            event.metadata.get("emergencyEventId") == emergency_event_id
            for event in self.list(user_id)
        )

    def delete(self, user_id: str, event_id: str) -> bool:
        reference = get_user_collection(user_id, self.collection_name).document(event_id)
        if not reference.get().exists:
            return False
        reference.delete()
        return True

    def clear_all(self, user_id: str) -> None:
        delete_collection(get_user_collection(user_id, self.collection_name))


incident_timeline_repository = IncidentTimelineRepository()
