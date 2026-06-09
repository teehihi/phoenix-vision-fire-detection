from app.core.config import settings
from app.models.detection import BoundingBox, DetectionEvent, DetectionSeverity
from app.repositories.alert_repository import alert_repository
from app.repositories.detection_repository import DetectionRepository
from app.services.ai_client import AIServiceClient
from app.services.alert_service import AlertService


class DetectionService:
    def __init__(self, repository: DetectionRepository) -> None:
        self.repository = repository
        self.ai_client = AIServiceClient()
        self.alert_service = AlertService(alert_repository)

    def list_events(self, user_id: str) -> list[DetectionEvent]:
        return self.repository.list(user_id)

    async def detect_frame(self, user_id: str, image_bytes: bytes, camera_id: str) -> list[DetectionEvent]:
        ai_results = await self.ai_client.detect_frame(image_bytes, camera_id)
        events = [self._to_event(item, camera_id) for item in ai_results]
        stored = self.repository.add_many(user_id, events)

        for event in stored:
            if event.confidence >= settings.alert_confidence_threshold:
                self.alert_service.create_from_detection(user_id, event)

        return stored

    def _to_event(self, item: dict, camera_id: str) -> DetectionEvent:
        confidence = float(item["confidence"])
        return DetectionEvent(
            camera_id=camera_id,
            label=item["label"],
            confidence=confidence,
            severity=self._severity_for(confidence),
            boxes=[BoundingBox(**box) for box in item.get("boxes", [])],
            snapshot_url=item.get("snapshot_url"),
        )

    def _severity_for(self, confidence: float) -> DetectionSeverity:
        if confidence >= 0.9:
            return DetectionSeverity.critical
        if confidence >= 0.75:
            return DetectionSeverity.high
        if confidence >= 0.55:
            return DetectionSeverity.medium
        return DetectionSeverity.low
