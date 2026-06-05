from __future__ import annotations

from datetime import datetime
import time

from PySide6.QtCore import QObject, Signal

from app.pipelines.frame_pipeline import draw_danger_analysis, draw_detections, draw_fps
from app.streams.webcam_stream import WebcamStream

from phoenixvision_desktop.core.detection import RealtimeDetector
from phoenixvision_desktop.core.models import FramePacket


class CameraWorker(QObject):
    frame_ready = Signal(object)
    failed = Signal(str)
    finished = Signal()

    def __init__(
        self,
        camera_index: int,
        fire_model_path: str,
        person_model_path: str,
        confidence: float,
        person_confidence: float,
    ) -> None:
        super().__init__()
        self.camera_index = camera_index
        self.fire_model_path = fire_model_path
        self.person_model_path = person_model_path
        self.confidence = confidence
        self.person_confidence = person_confidence
        self.running = False

    def run(self) -> None:
        self.running = True
        detector = RealtimeDetector(
            fire_model_path=self.fire_model_path,
            person_model_path=self.person_model_path,
            confidence=self.confidence,
            person_confidence=self.person_confidence,
        )
        stream = WebcamStream(camera_index=self.camera_index, width=960, height=540, fps=24)
        last_time = time.perf_counter()

        try:
            for frame in stream.frames():
                if not self.running:
                    break

                detections, analysis = detector.predict(frame)
                now = time.perf_counter()
                fps = 1.0 / max(now - last_time, 1e-6)
                last_time = now

                annotated = frame.copy()
                draw_detections(annotated, detections)
                draw_danger_analysis(annotated, analysis)
                draw_fps(annotated, fps)

                self.frame_ready.emit(
                    FramePacket(
                        frame_bgr=annotated,
                        fps=fps,
                        detections=detections,
                        analysis=analysis,
                        timestamp=datetime.now(),
                    )
                )
        except Exception as exc:
            self.failed.emit(str(exc))
        finally:
            self.finished.emit()

    def stop(self) -> None:
        self.running = False
