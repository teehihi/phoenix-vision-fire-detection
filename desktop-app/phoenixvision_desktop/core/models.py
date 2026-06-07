from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime
from urllib.parse import quote

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
    source_value: str = "0"
    enabled: bool = True
    group: str = "Default"
    username: str = ""
    password: str = ""
    host: str = ""
    port: int = 554
    channel: str = "101"
    stream_path: str = ""

    def stream_source(self) -> int | str:
        if self.source_type == "WEBCAM":
            try:
                return int(self.source_value)
            except ValueError:
                return 0

        if self.source_type == "HIKVISION":
            return self._hikvision_rtsp_url()

        if self.source_type in {"RTSP", "MJPEG", "HTTP"}:
            return self.source_value

        return self.source_value

    def display_source(self) -> str:
        if self.source_type == "WEBCAM":
            return f"Webcam index {self.source_value}"
        if self.host:
            return f"{self.host}:{self.port}"
        return self.source_value or "No source"

    def _hikvision_rtsp_url(self) -> str:
        host = self.host or self.source_value
        if not host:
            return ""

        channel = self.channel or "101"
        path = self.stream_path or f"/Streaming/Channels/{channel}"
        if not path.startswith("/"):
            path = f"/{path}"

        auth = ""
        if self.username:
            username = quote(self.username, safe="")
            password = quote(self.password, safe="")
            auth = f"{username}:{password}@"

        return f"rtsp://{auth}{host}:{self.port}{path}"


@dataclass
class FramePacket:
    camera_id: str
    frame_bgr: object | None
    fps: float
    detections: list[DetectionResult]
    analysis: DangerAnalysisResult
    timestamp: datetime
    error: str | None = None
