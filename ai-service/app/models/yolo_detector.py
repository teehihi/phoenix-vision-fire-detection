from pathlib import Path
from typing import Any

import numpy as np
from ultralytics import YOLO

from app.core.config import settings
from app.schemas.detection import BoundingBox, DetectionResult


class YoloDetector:
    def __init__(self, model_path: str) -> None:
        self.model_path = Path(model_path)
        self.model: YOLO | None = None

    def load(self) -> None:
        if self.model is None:
            self.model = YOLO(str(self.model_path))

    def predict(
        self,
        frame: np.ndarray,
        class_ids: list[int] | None = None,
        confidence: float | None = None,
    ) -> list[DetectionResult]:
        self.load()
        assert self.model is not None

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


yolo_detector = YoloDetector(settings.yolo_model_path)
