import cv2
import numpy as np

from app.schemas.danger import DangerAnalysisResult, RiskLevel
from app.schemas.detection import DetectionResult


def decode_image(image_bytes: bytes) -> np.ndarray:
    buffer = np.frombuffer(image_bytes, dtype=np.uint8)
    frame = cv2.imdecode(buffer, cv2.IMREAD_COLOR)
    if frame is None:
        raise ValueError("Unable to decode image bytes.")
    return frame


def annotate_frame(frame: np.ndarray, boxes: list[tuple[int, int, int, int]], label: str) -> np.ndarray:
    annotated = frame.copy()
    for x, y, width, height in boxes:
        cv2.rectangle(annotated, (x, y), (x + width, y + height), (0, 0, 255), 2)
        cv2.putText(annotated, label, (x, max(y - 10, 0)), cv2.FONT_HERSHEY_SIMPLEX, 0.6, (0, 0, 255), 2)
    return annotated


def draw_detections(frame: np.ndarray, detections: list[DetectionResult]) -> np.ndarray:
    for detection in detections:
        for box in detection.boxes:
            x = int(box.x)
            y = int(box.y)
            width = int(box.width)
            height = int(box.height)
            label = f"{detection.label} {detection.confidence:.2f}"

            cv2.rectangle(frame, (x, y), (x + width, y + height), (0, 0, 255), 2)
            cv2.rectangle(frame, (x, max(y - 26, 0)), (x + max(len(label) * 10, 120), y), (0, 0, 255), -1)
            cv2.putText(frame, label, (x + 5, max(y - 7, 14)), cv2.FONT_HERSHEY_SIMPLEX, 0.55, (255, 255, 255), 2)

    return frame


def draw_fps(frame: np.ndarray, fps: float) -> np.ndarray:
    label = f"FPS: {fps:.1f}"
    cv2.rectangle(frame, (12, 12), (130, 48), (15, 23, 42), -1)
    cv2.putText(frame, label, (22, 37), cv2.FONT_HERSHEY_SIMPLEX, 0.7, (34, 197, 94), 2)
    return frame


def draw_danger_analysis(frame: np.ndarray, analysis: DangerAnalysisResult) -> np.ndarray:
    for zone in analysis.danger_zones:
        x = int(zone.box.x)
        y = int(zone.box.y)
        width = int(zone.box.width)
        height = int(zone.box.height)
        cv2.rectangle(frame, (x, y), (x + width, y + height), (0, 165, 255), 2)
        cv2.putText(frame, "danger zone", (x, min(y + height + 20, frame.shape[0] - 10)), cv2.FONT_HERSHEY_SIMPLEX, 0.55, (0, 165, 255), 2)

    for human in analysis.humans_at_risk:
        x = int(human.person_box.x)
        y = int(human.person_box.y)
        width = int(human.person_box.width)
        height = int(human.person_box.height)
        cv2.rectangle(frame, (x, y), (x + width, y + height), (0, 0, 255), 3)
        cv2.putText(frame, "HUMAN AT RISK", (x, max(y - 32, 16)), cv2.FONT_HERSHEY_SIMPLEX, 0.65, (0, 0, 255), 2)

    _draw_risk_banner(frame, analysis)
    return frame


def _draw_risk_banner(frame: np.ndarray, analysis: DangerAnalysisResult) -> None:
    color = _risk_color(analysis.risk_level)
    cv2.rectangle(frame, (12, 56), (430, 148), color, -1)
    cv2.putText(
        frame,
        f"RISK: {analysis.risk_level} ({analysis.risk_score:.0f}/100)",
        (24, 82),
        cv2.FONT_HERSHEY_SIMPLEX,
        0.72,
        (255, 255, 255),
        2,
    )
    cv2.putText(frame, analysis.status, (24, 108), cv2.FONT_HERSHEY_SIMPLEX, 0.58, (255, 255, 255), 2)
    cv2.putText(
        frame,
        f"duration {analysis.duration_seconds:.1f}s | consistency {analysis.frame_consistency:.0%} | people {analysis.humans_detected_count} | at risk {analysis.humans_nearby_count}",
        (24, 134),
        cv2.FONT_HERSHEY_SIMPLEX,
        0.48,
        (255, 255, 255),
        1,
    )


def _risk_color(risk_level: RiskLevel) -> tuple[int, int, int]:
    colors = {
        RiskLevel.LOW: (59, 130, 246),
        RiskLevel.MEDIUM: (0, 165, 255),
        RiskLevel.HIGH: (0, 0, 255),
        RiskLevel.CRITICAL: (88, 28, 135),
    }
    return colors[risk_level]
