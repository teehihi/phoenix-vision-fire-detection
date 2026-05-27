from app.models.emergency import EmergencyEvent, EmergencyStatus


class EmergencyRepository:
    def __init__(self) -> None:
        self._events: list[EmergencyEvent] = []
        self._statuses: dict[str, EmergencyStatus] = {}

    def list_events(self) -> list[EmergencyEvent]:
        return sorted(self._events, key=lambda event: event.created_at, reverse=True)

    def add_event(self, event: EmergencyEvent) -> EmergencyEvent:
        self._events.append(event)
        return event

    def get_status(self, camera_id: str) -> EmergencyStatus:
        if camera_id not in self._statuses:
            self._statuses[camera_id] = EmergencyStatus(camera_id=camera_id)
        return self._statuses[camera_id]

    def save_status(self, status: EmergencyStatus) -> EmergencyStatus:
        self._statuses[status.camera_id] = status
        return status

    def find_event(self, event_id: str) -> EmergencyEvent | None:
        return next((event for event in self._events if event.id == event_id), None)


emergency_repository = EmergencyRepository()
