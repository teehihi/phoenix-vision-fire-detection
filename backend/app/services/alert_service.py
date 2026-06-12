from datetime import datetime, timedelta
from typing import NamedTuple
from uuid import uuid4

from app.models.alert import Alert
from app.models.detection import DetectionEvent
from app.repositories.alert_repository import AlertRepository


class AlertUpsertResult(NamedTuple):
    alert: Alert
    created: bool


class AlertService:
    dedupe_window = timedelta(seconds=90)

    def __init__(self, repository: AlertRepository) -> None:
        self.repository = repository

    def list_alerts(self, user_id: str) -> list[Alert]:
        return self.repository.list(user_id)

    def create_from_detection(self, user_id: str, detection: DetectionEvent) -> AlertUpsertResult:
        existing_alert = self.repository.find_recent_similar(
            user_id,
            camera_id=detection.camera_id,
            label=detection.label,
            since=datetime.utcnow() - self.dedupe_window,
        )
        if existing_alert is not None:
            updated_alert = existing_alert.model_copy(
                update={
                    "detection_id": detection.id,
                    "message": f"{detection.label.title()} detected on {detection.camera_id} with {detection.confidence:.0%} confidence.",
                    "severity": max(existing_alert.severity, detection.severity, key=self._severity_rank),
                    "snapshot_url": detection.snapshot_url or existing_alert.snapshot_url,
                    "occurrence_count": existing_alert.occurrence_count + 1,
                    "last_seen_at": datetime.utcnow(),
                }
            )
            return AlertUpsertResult(self.repository.save(user_id, updated_alert), False)

        incident_id = str(uuid4())
        alert = Alert(
            detection_id=detection.id,
            camera_id=detection.camera_id,
            label=detection.label,
            incident_id=incident_id,
            title=f"{detection.label.title()} detected",
            message=f"{detection.label.title()} detected on {detection.camera_id} with {detection.confidence:.0%} confidence.",
            severity=detection.severity,
            snapshot_url=detection.snapshot_url,
        )
        return AlertUpsertResult(self.repository.add(user_id, alert), True)

    def delete_alert(self, user_id: str, alert_id: str) -> bool:
        return self.repository.delete(user_id, alert_id)

    def clear_all_alerts(self, user_id: str) -> None:
        self.repository.clear_all(user_id)

    @staticmethod
    def _severity_rank(severity: str) -> int:
        order = {"low": 0, "medium": 1, "high": 2, "critical": 3}
        return order[str(severity)]
