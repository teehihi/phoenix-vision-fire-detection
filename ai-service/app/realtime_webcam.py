import argparse

import cv2

from app.core.config import settings
from app.models.yolo_detector import YoloDetector
from app.pipelines.frame_pipeline import draw_detections, draw_fps
from app.streams.webcam_stream import WebcamStream
from app.utils.fps import FPSCounter


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Realtime YOLO webcam object detection.")
    parser.add_argument("--model", default=settings.yolo_model_path, help="Path to fire/smoke YOLO .pt model weights.")
    parser.add_argument(
        "--person-model",
        default="yolo11n.pt",
        help="YOLOv11 model for person detection. Use empty string to disable.",
    )
    parser.add_argument("--camera", type=int, default=settings.camera_index, help="Webcam index.")
    parser.add_argument("--width", type=int, default=settings.camera_width, help="Capture width.")
    parser.add_argument("--height", type=int, default=settings.camera_height, help="Capture height.")
    parser.add_argument("--fps", type=int, default=settings.camera_fps, help="Requested camera FPS.")
    parser.add_argument("--window", default="Realtime YOLO Detection", help="OpenCV window title.")
    return parser.parse_args()


def run() -> None:
    args = parse_args()
    fire_detector = YoloDetector(args.model)
    person_detector = YoloDetector(args.person_model) if args.person_model else None
    stream = WebcamStream(camera_index=args.camera, width=args.width, height=args.height, fps=args.fps)
    fps_counter = FPSCounter()

    cv2.namedWindow(args.window, cv2.WINDOW_NORMAL)

    for frame in stream.frames():
        if stream.backend_name:
            cv2.setWindowTitle(args.window, f"{args.window} - {stream.backend_name}")
            stream.backend_name = None

        detections = fire_detector.predict(frame)
        if person_detector is not None:
            detections.extend(person_detector.predict(frame, class_ids=[0]))

        fps = fps_counter.update()

        draw_detections(frame, detections)
        draw_fps(frame, fps)
        cv2.imshow(args.window, frame)

        key = cv2.waitKey(1) & 0xFF
        if key in (ord("q"), 27):
            break

    cv2.destroyAllWindows()


if __name__ == "__main__":
    run()
