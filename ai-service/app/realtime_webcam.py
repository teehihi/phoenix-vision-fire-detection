import argparse

import cv2

from app.core.config import settings
from app.models.yolo_detector import YoloDetector
from app.pipelines.danger_analysis import DangerAnalysisConfig, DangerAnalyzer
from app.pipelines.frame_pipeline import draw_danger_analysis, draw_detections, draw_fps
from app.pipelines.temporal_smoothing import StableDetectionConfig, TemporalDetectionSmoother
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
    parser.add_argument("--fire-conf", type=float, default=0.55, help="Minimum stable confidence for fire.")
    parser.add_argument("--smoke-conf", type=float, default=0.50, help="Minimum stable confidence for smoke.")
    parser.add_argument("--person-conf", type=float, default=0.45, help="Minimum confidence for person detection.")
    parser.add_argument("--smoothing-window", type=int, default=5, help="Number of recent frames used for smoothing.")
    parser.add_argument("--stable-frames", type=int, default=3, help="Minimum hits in smoothing window before showing fire/smoke.")
    parser.add_argument("--cooldown-frames", type=int, default=2, help="Keep a stable hazard active through this many missed frames.")
    parser.add_argument("--min-area-ratio", type=float, default=0.001, help="Drop tiny fire/smoke boxes below this frame-area ratio.")
    parser.add_argument("--person-every", type=int, default=3, help="Run person detection every N frames and reuse last result.")
    parser.add_argument("--danger-margin", type=float, default=0.40, help="Expand fire/smoke boxes by this ratio for danger zones.")
    parser.add_argument("--danger-distance", type=float, default=0.18, help="Max center-distance ratio for nearby human risk.")
    parser.add_argument("--window", default="Realtime YOLO Detection", help="OpenCV window title.")
    return parser.parse_args()


def run() -> None:
    args = parse_args()
    fire_detector = YoloDetector(args.model)
    person_detector = YoloDetector(args.person_model) if args.person_model else None
    stream = WebcamStream(camera_index=args.camera, width=args.width, height=args.height, fps=args.fps)
    fps_counter = FPSCounter()
    smoother = TemporalDetectionSmoother(
        StableDetectionConfig(
            window_size=args.smoothing_window,
            min_hits=args.stable_frames,
            fire_confidence=args.fire_conf,
            smoke_confidence=args.smoke_conf,
            person_confidence=args.person_conf,
            min_area_ratio=args.min_area_ratio,
            cooldown_frames=args.cooldown_frames,
        )
    )
    frame_index = 0
    person_detections = []
    danger_analyzer = DangerAnalyzer(
        DangerAnalysisConfig(
            zone_margin_ratio=args.danger_margin,
            center_distance_ratio=args.danger_distance,
        )
    )

    cv2.namedWindow(args.window, cv2.WINDOW_NORMAL)

    for frame in stream.frames():
        if stream.backend_name:
            cv2.setWindowTitle(args.window, f"{args.window} - {stream.backend_name}")
            stream.backend_name = None

        fire_detections = fire_detector.predict(frame, confidence=min(args.fire_conf, args.smoke_conf))
        if person_detector is not None:
            if frame_index % max(args.person_every, 1) == 0:
                person_detections = person_detector.predict(frame, class_ids=[0], confidence=args.person_conf)
        detections = smoother.update(
            fire_detections + person_detections,
            frame_width=frame.shape[1],
            frame_height=frame.shape[0],
        )
        frame_index += 1

        fps = fps_counter.update()
        danger_analysis = danger_analyzer.analyze(
            detections,
            frame_width=frame.shape[1],
            frame_height=frame.shape[0],
        )

        draw_detections(frame, detections)
        draw_danger_analysis(frame, danger_analysis)
        draw_fps(frame, fps)
        cv2.imshow(args.window, frame)

        key = cv2.waitKey(1) & 0xFF
        if key in (ord("q"), 27):
            break

    cv2.destroyAllWindows()


if __name__ == "__main__":
    run()
