from collections.abc import Iterator
from pathlib import Path
import platform
import time

import cv2
import numpy as np

from app.core.config import settings


class WebcamStream:
    def __init__(
        self,
        camera_index: int = settings.camera_index,
        source: int | str | None = None,
        width: int = settings.camera_width,
        height: int = settings.camera_height,
        fps: int = settings.camera_fps,
        max_read_failures: int = 30,
    ) -> None:
        self.camera_index = camera_index
        self.source = camera_index if source is None else source
        self.width = width
        self.height = height
        self.fps = fps
        self.max_read_failures = max_read_failures
        self.backend_name: str | None = None

    def frames(self) -> Iterator[np.ndarray]:
        capture = self._open_capture()
        read_failures = 0
        should_loop = self._is_video_file_source()

        try:
            if should_loop:
                yield from self._video_file_frames(capture)
                return

            while capture.isOpened():
                success, frame = capture.read()
                if not success:
                    read_failures += 1
                    if read_failures >= self.max_read_failures:
                        raise RuntimeError(
                            f"Camera source {self.source} stopped returning frames after {read_failures} read attempts."
                        )
                    time.sleep(1 / max(self.fps, 1))
                    continue

                read_failures = 0
                yield self._resize_frame(frame)
        finally:
            capture.release()

    def _video_file_frames(self, capture: cv2.VideoCapture) -> Iterator[np.ndarray]:
        source_fps = capture.get(cv2.CAP_PROP_FPS) or self.fps or 30
        frame_count = capture.get(cv2.CAP_PROP_FRAME_COUNT) or 0
        duration_seconds = frame_count / source_fps if source_fps > 0 and frame_count > 0 else 0
        started_at = time.monotonic()
        current_frame_index = 0

        while capture.isOpened():
            if duration_seconds > 0:
                elapsed = (time.monotonic() - started_at) % duration_seconds
                target_frame_index = int(elapsed * source_fps)

                if target_frame_index < current_frame_index:
                    capture.set(cv2.CAP_PROP_POS_FRAMES, target_frame_index)
                    current_frame_index = target_frame_index
                else:
                    frames_to_skip = target_frame_index - current_frame_index
                    if frames_to_skip > source_fps * 2:
                        capture.set(cv2.CAP_PROP_POS_FRAMES, target_frame_index)
                        current_frame_index = target_frame_index
                    else:
                        for _ in range(frames_to_skip):
                            if not capture.grab():
                                capture.set(cv2.CAP_PROP_POS_FRAMES, 0)
                                started_at = time.monotonic()
                                current_frame_index = 0
                                break
                            current_frame_index += 1

            success, frame = capture.read()
            if not success:
                capture.set(cv2.CAP_PROP_POS_FRAMES, 0)
                started_at = time.monotonic()
                current_frame_index = 0
                continue

            current_frame_index += 1
            yield self._resize_frame(frame)

    def _is_video_file_source(self) -> bool:
        if not isinstance(self.source, str):
            return False

        source = self.source.strip()
        if not source or "://" in source:
            return False

        return Path(source).expanduser().exists()

    def _resize_frame(self, frame: np.ndarray) -> np.ndarray:
        if self.width <= 0 or self.height <= 0:
            return frame

        if frame.shape[1] == self.width and frame.shape[0] == self.height:
            return frame

        return cv2.resize(frame, (self.width, self.height), interpolation=cv2.INTER_AREA)

    def _open_capture(self) -> cv2.VideoCapture:
        if isinstance(self.source, str):
            return self._open_url_capture()

        errors: list[str] = []

        for backend_name, backend_id in self._candidate_backends():
            try:
                capture = cv2.VideoCapture(int(self.source), backend_id)
                self._configure_capture(capture)
            except cv2.error as exc:
                errors.append(f"{backend_name} ({exc})")
                try:
                    capture.release()
                except Exception:
                    pass
                continue

            if capture.isOpened():
                self.backend_name = backend_name
                return capture

            capture.release()
            errors.append(backend_name)

        tried = ", ".join(errors)
        raise RuntimeError(
            f"Unable to open webcam index {self.source}. Tried backends: {tried}. "
            "Check camera permissions and try another camera index."
        )

    def _open_url_capture(self) -> cv2.VideoCapture:
        import os
        # Ép dùng TCP thay vì UDP để chống nhiễu/timeout khi stream RTSP trong nội mạng/Docker
        os.environ["OPENCV_FFMPEG_CAPTURE_OPTIONS"] = "rtsp_transport;tcp|analyzeduration;500000|probesize;500000"

        errors: list[str] = []

        for backend_name, backend_id in [("FFmpeg", cv2.CAP_FFMPEG), ("Any", cv2.CAP_ANY)]:
            try:
                capture = cv2.VideoCapture(self.source, backend_id)
                self._configure_capture(capture)
            except cv2.error as exc:
                errors.append(f"{backend_name} ({exc})")
                try:
                    capture.release()
                except Exception:
                    pass
                continue

            if capture.isOpened():
                self.backend_name = backend_name
                return capture

            capture.release()
            errors.append(backend_name)

        tried = ", ".join(errors)
        raise RuntimeError(f"Unable to open camera URL/source {self.source}. Tried backends: {tried}.")

    def _configure_capture(self, capture: cv2.VideoCapture) -> None:
        for prop, value in (
            (cv2.CAP_PROP_FRAME_WIDTH, self.width),
            (cv2.CAP_PROP_FRAME_HEIGHT, self.height),
            (cv2.CAP_PROP_FPS, self.fps),
            (cv2.CAP_PROP_BUFFERSIZE, 1),
        ):
            try:
                capture.set(prop, value)
            except cv2.error:
                continue

    def _candidate_backends(self) -> list[tuple[str, int]]:
        system = platform.system()

        if system == "Darwin":
            return [
                ("AVFoundation", cv2.CAP_AVFOUNDATION),
                ("Any", cv2.CAP_ANY),
            ]

        if system == "Windows":
            return [
                ("DirectShow", cv2.CAP_DSHOW),
                ("Media Foundation", cv2.CAP_MSMF),
                ("Any", cv2.CAP_ANY),
            ]

        return [
            ("V4L2", cv2.CAP_V4L2),
            ("Any", cv2.CAP_ANY),
        ]
