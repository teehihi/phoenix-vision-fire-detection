import cv2
import numpy as np

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
