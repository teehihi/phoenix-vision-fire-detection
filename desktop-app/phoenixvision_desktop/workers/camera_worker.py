from __future__ import annotations

from datetime import datetime
import time

from PySide6.QtCore import QObject, Signal

from app.pipelines.frame_pipeline import draw_danger_analysis, draw_detections, draw_fps
from app.streams.webcam_stream import WebcamStream

from phoenixvision_desktop.core.detection import RealtimeDetector
from phoenixvision_desktop.core.models import CameraConfig, FramePacket


class CameraWorker(QObject):
    frame_ready = Signal(object)
    failed = Signal(str)
    finished = Signal()

    def __init__(
        self,
        camera: CameraConfig,
        fire_model_path: str,
        person_model_path: str,
        fire_confidence: float,
        smoke_confidence: float,
        person_confidence: float,
        smoothing_window: int,
        stable_frames: int,
        cooldown_frames: int,
    ) -> None:
        super().__init__()
        self.camera = camera
        self.fire_model_path = fire_model_path
        self.person_model_path = person_model_path
        self.fire_confidence = fire_confidence
        self.smoke_confidence = smoke_confidence
        self.person_confidence = person_confidence
        self.smoothing_window = smoothing_window
        self.stable_frames = stable_frames
        self.cooldown_frames = cooldown_frames
        self.running = False

    def run(self) -> None:
        self.running = True
        detector = RealtimeDetector(
            fire_model_path=self.fire_model_path,
            person_model_path=self.person_model_path,
            fire_confidence=self.fire_confidence,
            smoke_confidence=self.smoke_confidence,
            person_confidence=self.person_confidence,
            smoothing_window=self.smoothing_window,
            stable_frames=self.stable_frames,
            cooldown_frames=self.cooldown_frames,
        )
        stream = WebcamStream(source=self.camera.stream_source(), width=960, height=540, fps=24)
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
                        camera_id=self.camera.camera_id,
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
