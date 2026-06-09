import asyncio
import time
from collections.abc import Iterator
from typing import Any

from fastapi import APIRouter, WebSocket, WebSocketDisconnect

from app.core.config import settings
from app.models.yolo_detector import get_yolo_detector
from app.pipelines.danger_analysis import DangerAnalysisConfig, DangerAnalyzer
from app.pipelines.frame_pipeline import draw_danger_analysis, draw_detections
from app.pipelines.temporal_smoothing import StableDetectionConfig, TemporalDetectionSmoother
from app.streams.webcam_stream import WebcamStream
from app.utils.fps import FPSCounter
from app.utils.frame_encoding import encode_jpeg_base64

router = APIRouter()


@router.websocket("/webcam")
async def stream_webcam(websocket: WebSocket) -> None:
    await websocket.accept()

    query = websocket.query_params
    camera_index = int(query.get("camera", settings.camera_index))
    camera_id = query.get("camera_id", f"webcam-{camera_index}")
    source_url = query.get("source")
    width = int(query.get("width", 960))
    height = int(query.get("height", 540))
    target_fps = int(query.get("fps", 12))
    jpeg_quality = int(query.get("quality", 72))
    model_path = query.get("model", settings.yolo_model_path)
    person_model_path = query.get("person_model", "")
    person_every = max(int(query.get("person_every", 4)), 1)
    max_read_failures = max(int(query.get("read_failures", 30)), 1)

    fire_detector = get_yolo_detector(model_path)
    person_detector = get_yolo_detector(person_model_path) if person_model_path else None
    stream = WebcamStream(
        camera_index=camera_index,
        source=source_url,
        width=width,
        height=height,
        fps=target_fps,
        max_read_failures=max_read_failures,
    )
    fps_counter = FPSCounter()
    smoother = TemporalDetectionSmoother(StableDetectionConfig())
    analyzer = DangerAnalyzer(DangerAnalysisConfig())
    person_detections = []
    frame_index = 0
    frame_delay = 1 / max(target_fps, 1)
    frames = iter(stream.frames())

    try:
        while True:
            frame = await asyncio.to_thread(_next_frame, frames)
            if frame is None:
                break

            started_at = time.perf_counter()
            fire_detections = await asyncio.to_thread(fire_detector.predict, frame)
            detections = smoother.update(fire_detections, frame_width=frame.shape[1], frame_height=frame.shape[0])

            if person_detector is not None and frame_index % person_every == 0:
                person_detections = await asyncio.to_thread(
                    person_detector.predict,
                    frame,
                    class_ids=[0],
                    confidence=0.45,
                )

            detections.extend(person_detections)
            analysis = analyzer.analyze(detections, frame_width=frame.shape[1], frame_height=frame.shape[0])
            fps = fps_counter.update()

            draw_detections(frame, detections)
            draw_danger_analysis(frame, analysis, draw_banner=False)

            await websocket.send_json(
                {
                    "type": "processed_frame",
                    "cameraId": camera_id,
                    "timestamp": time.time(),
                    "fps": fps,
                    "frame": encode_jpeg_base64(frame, quality=jpeg_quality),
                    "detections": [detection.model_dump(mode="json") for detection in detections],
                    "risk": {
                        "riskLevel": analysis.risk_level,
                        "riskScore": analysis.risk_score,
                        "status": analysis.status,
                        "humanAtRisk": analysis.human_at_risk,
                        "durationSeconds": analysis.duration_seconds,
                        "frameConsistency": analysis.frame_consistency,
                        "humansDetectedCount": analysis.humans_detected_count,
                        "humansNearbyCount": analysis.humans_nearby_count,
                        "fireDetected": analysis.fire_detected,
                        "smokeDetected": analysis.smoke_detected,
                        "humanDetected": analysis.human_detected,
                        "fireAreaRatio": analysis.fire_area_ratio,
                        "smokeAreaRatio": analysis.smoke_area_ratio,
                    },
                }
            )

            frame_index += 1
            elapsed = time.perf_counter() - started_at
            await asyncio.sleep(max(frame_delay - elapsed, 0))
    except WebSocketDisconnect:
        return
    except Exception as exc:
        import traceback
        traceback.print_exc()
        await websocket.send_json({"type": "stream_error", "message": str(exc)})
        await websocket.close(code=1011)


def _next_frame(frames: Iterator[Any]) -> Any | None:
    try:
        return next(frames)
    except StopIteration:
        return None
