from __future__ import annotations

from dataclasses import asdict
import json
from pathlib import Path
from time import perf_counter
from uuid import uuid4

import cv2

from phoenixvision_desktop.core.models import CameraConfig
from phoenixvision_desktop.core.paths import CACHE_DIR


REGISTRY_PATH = CACHE_DIR / "desktop-cameras.json"
TEXT_NORMALIZATION = {
    "May hien tai": "Máy hiện tại",
    "San sang": "Sẵn sàng",
    "Dang tat": "Đang tắt",
    "Dang hoat dong": "Đang hoạt động",
    "Mat ket noi": "Mất kết nối",
    "Can chu y": "Cần chú ý",
}


class CameraRegistry:
    def __init__(self, path: Path = REGISTRY_PATH) -> None:
        self.path = path
        self.path.parent.mkdir(parents=True, exist_ok=True)

    def load(self) -> list[CameraConfig]:
        if not self.path.exists():
            cameras = default_cameras()
            self.save(cameras)
            return cameras

        try:
            payload = json.loads(self.path.read_text(encoding="utf-8"))
            return [camera_from_dict(item) for item in payload]
        except (OSError, json.JSONDecodeError, TypeError, ValueError):
            return default_cameras()

    def save(self, cameras: list[CameraConfig]) -> None:
        payload = [asdict(camera) for camera in cameras]
        self.path.write_text(json.dumps(payload, indent=2, ensure_ascii=False), encoding="utf-8")


def camera_from_dict(data: dict) -> CameraConfig:
    allowed = CameraConfig.__dataclass_fields__.keys()
    clean = {key: value for key, value in data.items() if key in allowed}
    for field in ("name", "area", "status", "group"):
        value = clean.get(field)
        if isinstance(value, str):
            clean[field] = TEXT_NORMALIZATION.get(value, value)
    return CameraConfig(**clean)


def new_camera_id(prefix: str = "cam") -> str:
    return f"{prefix}-{uuid4().hex[:8]}"


def default_cameras() -> list[CameraConfig]:
    return [
        CameraConfig(
            "local",
            "Webcam local",
            "Máy hiện tại",
            "WEBCAM",
            "Sẵn sàng",
            "LOW",
            0,
            0.0,
            True,
            source_value="0",
            group="Local",
        ),
    ]


class CameraConnectionTester:
    def __init__(self, timeout_seconds: float = 5.0) -> None:
        self.timeout_seconds = timeout_seconds

    def test(self, camera: CameraConfig) -> tuple[bool, str]:
        if not camera.enabled:
            return False, "Camera đang tắt. Hãy bật camera trước khi test."

        source = camera.stream_source()
        if source == "":
            return False, "Nguồn camera đang trống. Hãy nhập URL, IP hoặc webcam index."

        capture = self._open_capture(source)
        started = perf_counter()

        try:
            if not capture.isOpened():
                return False, f"Không mở được nguồn {camera.display_source()}."

            while perf_counter() - started < self.timeout_seconds:
                ok, frame = capture.read()
                if ok and frame is not None:
                    height, width = frame.shape[:2]
                    return True, f"Kết nối OK: nhận frame {width}x{height}."

            return False, "Mở được camera nhưng không đọc được frame trong thời gian chờ."
        except cv2.error as exc:
            return False, f"OpenCV lỗi khi đọc camera: {exc}"
        finally:
            capture.release()

    @staticmethod
    def _open_capture(source: int | str) -> cv2.VideoCapture:
        if isinstance(source, int):
            return cv2.VideoCapture(source)

        capture = cv2.VideoCapture(source, cv2.CAP_FFMPEG)
        if capture.isOpened():
            return capture

        capture.release()
        return cv2.VideoCapture(source, cv2.CAP_ANY)
