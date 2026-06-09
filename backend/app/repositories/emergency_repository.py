from datetime import datetime

from app.db.firestore import delete_collection, get_user_collection, with_expiration
from app.models.emergency import EmergencyEvent, EmergencyState, EmergencyStatus


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

    def delete_event(self, user_id: str, event_id: str) -> bool:
        reference = get_user_collection(user_id, self.event_collection_name).document(event_id)
        if not reference.get().exists:
            return False
        reference.delete()
        return True

    def clear_events(self, user_id: str) -> None:
        delete_collection(get_user_collection(user_id, self.event_collection_name))

    def list_statuses(self, user_id: str) -> list[EmergencyStatus]:
        return [
            EmergencyStatus.model_validate(document.to_dict())
            for document in get_user_collection(user_id, self.status_collection_name).stream()
        ]

    def reset_status_for_event(self, user_id: str, event_id: str) -> None:
        for status in self.list_statuses(user_id):
            if status.active_event_id == event_id:
                self.save_status(user_id, self._reset_status(status))

    def reset_all_statuses(self, user_id: str) -> None:
        for status in self.list_statuses(user_id):
            self.save_status(user_id, self._reset_status(status))

    @staticmethod
    def _reset_status(status: EmergencyStatus) -> EmergencyStatus:
        now = datetime.utcnow()
        return status.model_copy(
            update={
                "state": EmergencyState.monitoring,
                "risk_level": "LOW",
                "risk_score": 0.0,
                "human_at_risk": False,
                "active_event_id": None,
                "snapshot_url": None,
                "last_transition_at": now,
                "updated_at": now,
            }
        )


emergency_repository = EmergencyRepository()
