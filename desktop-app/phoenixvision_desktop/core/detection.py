from __future__ import annotations

from pathlib import Path
from typing import Iterable

import cv2
from PySide6.QtCore import QSize, Qt
from PySide6.QtGui import QImage, QPixmap

from app.models.yolo_detector import YoloDetector
from app.pipelines.danger_analysis import DangerAnalysisConfig, DangerAnalyzer
from app.pipelines.temporal_smoothing import StableDetectionConfig, TemporalDetectionSmoother
from app.schemas.danger import DangerAnalysisResult
from app.schemas.detection import DetectionResult


class RealtimeDetector:
    def __init__(
        self,
        fire_model_path: str,
        person_model_path: str,
        fire_confidence: float,
        smoke_confidence: float,
        person_confidence: float,
        smoothing_window: int = 5,
        stable_frames: int = 3,
        cooldown_frames: int = 2,
        min_area_ratio: float = 0.001,
    ) -> None:
        self.fire_detector = YoloDetector(fire_model_path)
        self.person_detector = YoloDetector(person_model_path)
        self.fire_confidence = fire_confidence
        self.smoke_confidence = smoke_confidence
        self.person_confidence = person_confidence
        self.analyzer = DangerAnalyzer(DangerAnalysisConfig())
        self.smoother = TemporalDetectionSmoother(
            StableDetectionConfig(
                window_size=smoothing_window,
                min_hits=stable_frames,
                fire_confidence=fire_confidence,
                smoke_confidence=smoke_confidence,
                person_confidence=person_confidence,
                min_area_ratio=min_area_ratio,
                cooldown_frames=cooldown_frames,
            )
        )
        self.person_enabled = Path(person_model_path).exists() or person_model_path == "yolo11n.pt"

    def predict(self, frame) -> tuple[list[DetectionResult], DangerAnalysisResult]:
        fire_smoke = self.fire_detector.predict(
            frame,
            confidence=min(self.fire_confidence, self.smoke_confidence),
        )
        people: list[DetectionResult] = []

        if self.person_enabled:
            try:
                people = self.person_detector.predict(frame, class_ids=[0], confidence=self.person_confidence)
            except Exception:
                self.person_enabled = False

        height, width = frame.shape[:2]
        detections = self.smoother.update(
            fire_smoke + people,
            frame_width=width,
            frame_height=height,
        )
        analysis = self.analyzer.analyze(detections, frame_width=width, frame_height=height)
        return detections, analysis


def pixmap_from_bgr(frame_bgr, target_size: QSize) -> QPixmap:
    frame_rgb = cv2.cvtColor(frame_bgr, cv2.COLOR_BGR2RGB)
    height, width, channels = frame_rgb.shape
    bytes_per_line = channels * width
    image = QImage(frame_rgb.data, width, height, bytes_per_line, QImage.Format_RGB888).copy()
    return QPixmap.fromImage(image).scaled(target_size, Qt.KeepAspectRatioByExpanding, Qt.SmoothTransformation)


def count_labels(detections: Iterable[DetectionResult], labels: set[str]) -> int:
    return sum(len(detection.boxes) for detection in detections if detection.label.lower() in labels)
