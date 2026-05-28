import asyncio
import time

from fastapi import APIRouter, WebSocket, WebSocketDisconnect

from app.core.config import settings
from app.models.yolo_detector import YoloDetector
from app.pipelines.danger_analysis import DangerAnalysisConfig, DangerAnalyzer
from app.pipelines.frame_pipeline import draw_danger_analysis, draw_detections, draw_fps
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
    width = int(query.get("width", 960))
    height = int(query.get("height", 540))
    target_fps = int(query.get("fps", 12))
    jpeg_quality = int(query.get("quality", 72))
    model_path = query.get("model", settings.yolo_model_path)
    person_model_path = query.get("person_model", "yolo11n.pt")
    person_every = max(int(query.get("person_every", 4)), 1)

    fire_detector = YoloDetector(model_path)
    person_detector = YoloDetector(person_model_path) if person_model_path else None
    stream = WebcamStream(camera_index=camera_index, width=width, height=height, fps=target_fps)
    fps_counter = FPSCounter()
    smoother = TemporalDetectionSmoother(StableDetectionConfig())
    analyzer = DangerAnalyzer(DangerAnalysisConfig())
    person_detections = []
    frame_index = 0
    frame_delay = 1 / max(target_fps, 1)

    try:
        for frame in stream.frames():
            started_at = time.perf_counter()
            fire_detections = fire_detector.predict(frame)
            detections = smoother.update(fire_detections, frame_width=frame.shape[1], frame_height=frame.shape[0])

            if person_detector is not None and frame_index % person_every == 0:
                person_detections = person_detector.predict(frame, class_ids=[0], confidence=0.45)

            detections.extend(person_detections)
            analysis = analyzer.analyze(detections, frame_width=frame.shape[1], frame_height=frame.shape[0])
            fps = fps_counter.update()

            draw_detections(frame, detections)
            draw_danger_analysis(frame, analysis)
            draw_fps(frame, fps)

            await websocket.send_json(
                {
                    "type": "processed_frame",
                    "cameraId": f"webcam-{camera_index}",
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
        await websocket.send_json({"type": "stream_error", "message": str(exc)})
        await websocket.close(code=1011)
