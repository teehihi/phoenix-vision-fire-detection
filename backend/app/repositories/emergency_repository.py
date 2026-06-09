from app.db.firestore import get_user_collection, with_expiration
from app.models.emergency import EmergencyEvent, EmergencyStatus


class EmergencyRepository:
    event_collection_name = "emergencyEvents"
    status_collection_name = "emergencyStatuses"

    def list_events(self, user_id: str) -> list[EmergencyEvent]:
        events = [
            EmergencyEvent.model_validate(document.to_dict())
            for document in get_user_collection(user_id, self.event_collection_name).stream()
        ]
        return sorted(events, key=lambda event: event.created_at, reverse=True)

    def add_event(self, user_id: str, event: EmergencyEvent) -> EmergencyEvent:
        data = with_expiration(event.model_dump(mode="python"))
        get_user_collection(user_id, self.event_collection_name).document(event.id).set(data)
        return event

    def save_event(self, user_id: str, event: EmergencyEvent) -> EmergencyEvent:
        data = with_expiration(event.model_dump(mode="python"))
        get_user_collection(user_id, self.event_collection_name).document(event.id).set(data)
        return event

    def get_status(self, user_id: str, camera_id: str) -> EmergencyStatus:
        snapshot = get_user_collection(user_id, self.status_collection_name).document(camera_id).get()
        if snapshot.exists:
            return EmergencyStatus.model_validate(snapshot.to_dict())

        status = EmergencyStatus(camera_id=camera_id)
        return self.save_status(user_id, status)

    def save_status(self, user_id: str, status: EmergencyStatus) -> EmergencyStatus:
        get_user_collection(user_id, self.status_collection_name).document(status.camera_id).set(status.model_dump(mode="python"))
        return status

    def find_event(self, user_id: str, event_id: str) -> EmergencyEvent | None:
        snapshot = get_user_collection(user_id, self.event_collection_name).document(event_id).get()
        return EmergencyEvent.model_validate(snapshot.to_dict()) if snapshot.exists else None


emergency_repository = EmergencyRepository()
