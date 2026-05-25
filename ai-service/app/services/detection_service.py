from app.models.yolo_detector import yolo_detector
from app.pipelines.frame_pipeline import decode_image
from app.schemas.detection import DetectionResult


class DetectionService:
    def detect_image_bytes(self, image_bytes: bytes, camera_id: str) -> list[DetectionResult]:
        frame = decode_image(image_bytes)
        return yolo_detector.predict(frame)


detection_service = DetectionService()
