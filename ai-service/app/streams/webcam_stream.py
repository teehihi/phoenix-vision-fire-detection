from collections.abc import Iterator
import platform

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
    ) -> None:
        self.camera_index = camera_index
        self.source = camera_index if source is None else source
        self.width = width
        self.height = height
        self.fps = fps
        self.backend_name: str | None = None

    def frames(self) -> Iterator[np.ndarray]:
        capture = self._open_capture()

        try:
            while capture.isOpened():
                success, frame = capture.read()
                if not success:
                    break
                yield frame
        finally:
            capture.release()

    def _open_capture(self) -> cv2.VideoCapture:
        if isinstance(self.source, str):
            return self._open_url_capture()

        errors: list[str] = []

        for backend_name, backend_id in self._candidate_backends():
            capture = cv2.VideoCapture(int(self.source), backend_id)
            self._configure_capture(capture)

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
        errors: list[str] = []

        for backend_name, backend_id in [("FFmpeg", cv2.CAP_FFMPEG), ("Any", cv2.CAP_ANY)]:
            capture = cv2.VideoCapture(self.source, backend_id)
            self._configure_capture(capture)

            if capture.isOpened():
                self.backend_name = backend_name
                return capture

            capture.release()
            errors.append(backend_name)

        tried = ", ".join(errors)
        raise RuntimeError(f"Unable to open camera URL/source {self.source}. Tried backends: {tried}.")

    def _configure_capture(self, capture: cv2.VideoCapture) -> None:
        capture.set(cv2.CAP_PROP_FRAME_WIDTH, self.width)
        capture.set(cv2.CAP_PROP_FRAME_HEIGHT, self.height)
        capture.set(cv2.CAP_PROP_FPS, self.fps)
        capture.set(cv2.CAP_PROP_BUFFERSIZE, 1)

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
