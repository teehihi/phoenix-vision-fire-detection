from app.models.alert import Alert
from app.models.detection import DetectionEvent
from app.repositories.alert_repository import AlertRepository


class AlertService:
    def __init__(self, repository: AlertRepository) -> None:
        self.repository = repository

    def list_alerts(self, user_id: str) -> list[Alert]:
        return self.repository.list(user_id)

    def create_from_detection(self, user_id: str, detection: DetectionEvent) -> Alert:
        alert = Alert(
            detection_id=detection.id,
            title=f"{detection.label.title()} detected",
            message=f"{detection.label.title()} detected on {detection.camera_id} with {detection.confidence:.0%} confidence.",
            severity=detection.severity,
        )
        return self.repository.add(user_id, alert)

    def delete_alert(self, user_id: str, alert_id: str) -> bool:
        return self.repository.delete(user_id, alert_id)

    def clear_all_alerts(self, user_id: str) -> None:
        self.repository.clear_all(user_id)
