from app.models.alert import Alert
from app.models.detection import DetectionEvent
from app.repositories.alert_repository import AlertRepository


class AlertService:
    def __init__(self, repository: AlertRepository) -> None:
        self.repository = repository

    def list_alerts(self) -> list[Alert]:
        return self.repository.list()

    def create_from_detection(self, detection: DetectionEvent) -> Alert:
        alert = Alert(
            detection_id=detection.id,
            title=f"{detection.label.title()} detected",
            message=f"{detection.label.title()} detected on {detection.camera_id} with {detection.confidence:.0%} confidence.",
            severity=detection.severity,
        )
        return self.repository.add(alert)
