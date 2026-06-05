from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime

from app.schemas.danger import DangerAnalysisResult
from app.schemas.detection import DetectionResult


@dataclass(frozen=True)
class CameraConfig:
    camera_id: str
    name: str
    area: str
    source_type: str
    status: str
    risk_level: str
    risk_score: int
    fps: float
    is_local: bool = False


@dataclass
class FramePacket:
    frame_bgr: object | None
    fps: float
    detections: list[DetectionResult]
    analysis: DangerAnalysisResult
    timestamp: datetime
    error: str | None = None
