from pathlib import Path
from threading import Lock
from typing import Any

import numpy as np
from ultralytics import YOLO

from app.core.config import settings
from app.schemas.detection import BoundingBox, DetectionResult


class YoloDetector:
    def __init__(self, model_path: str) -> None:
        self.model_path = Path(model_path)
        self.model: YOLO | None = None
        self._lock = Lock()

    def load(self) -> None:
        with self._lock:
            if self.model is None:
                self.model = YOLO(str(self.model_path))

    def predict(
        self,
        frame: np.ndarray,
        class_ids: list[int] | None = None,
        confidence: float | None = None,
    ) -> list[DetectionResult]:
        with self._lock:
            if self.model is None:
                self.model = YOLO(str(self.model_path))
            results: list[Any] = self.model.predict(
                frame,
                conf=confidence if confidence is not None else settings.detection_confidence,
                imgsz=settings.inference_size,
                device=settings.yolo_device,
                classes=class_ids,
                verbose=False,
            )

        detections: list[DetectionResult] = []
        for result in results:
            names = result.names
            for box in result.boxes:
                x1, y1, x2, y2 = box.xyxy[0].tolist()
                class_id = int(box.cls[0])
                detections.append(
                    DetectionResult(
                        label=names[class_id],
                        confidence=float(box.conf[0]),
                        boxes=[
                            BoundingBox(
                                x=float(x1),
                                y=float(y1),
                                width=float(x2 - x1),
                                height=float(y2 - y1),
                            )
                        ],
                    )
                )

        return detections


_detectors: dict[str, YoloDetector] = {}
_detectors_lock = Lock()


def get_yolo_detector(model_path: str) -> YoloDetector:
    normalized_path = str(Path(model_path).expanduser().resolve())
    with _detectors_lock:
        detector = _detectors.get(normalized_path)
        if detector is None:
            detector = YoloDetector(normalized_path)
            _detectors[normalized_path] = detector
        return detector


yolo_detector = get_yolo_detector(settings.yolo_model_path)
