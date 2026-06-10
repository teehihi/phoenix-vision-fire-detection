from collections import deque
from dataclasses import dataclass

from app.schemas.detection import DetectionResult


@dataclass(frozen=True)
class StableDetectionConfig:
    window_size: int = 5
    min_hits: int = 3
    fire_confidence: float = 0.65
    smoke_confidence: float = 0.12
    person_confidence: float = 0.45
    min_area_ratio: float = 0.001
    cooldown_frames: int = 2


class TemporalDetectionSmoother:
    def __init__(self, config: StableDetectionConfig) -> None:
        self.config = config
        self.history: deque[list[DetectionResult]] = deque(maxlen=config.window_size)
        self.active_labels: set[str] = set()
        self.missed_frames: dict[str, int] = {"fire": 0, "smoke": 0}
        self.last_stable_detections: dict[str, list[DetectionResult]] = {"fire": [], "smoke": []}

    def update(self, detections: list[DetectionResult], frame_width: int, frame_height: int) -> list[DetectionResult]:
        filtered = self._filter_current_detections(detections, frame_width, frame_height)
        self.history.append(filtered)

        stable_labels = self._stable_labels()
        output = [detection for detection in filtered if detection.label.lower() not in {"fire", "smoke"}]

        for label in ("fire", "smoke"):
            current = [detection for detection in filtered if detection.label.lower() == label]
            if current and label in stable_labels:
                self.active_labels.add(label)
                self.missed_frames[label] = 0
                self.last_stable_detections[label] = current
                output.extend(current)
                continue

            if label not in self.active_labels:
                continue

            if current:
                self.missed_frames[label] = 0
                self.last_stable_detections[label] = current
                output.extend(current)
                continue

            self.missed_frames[label] += 1
            if self.missed_frames[label] <= self.config.cooldown_frames:
                output.extend(self.last_stable_detections[label])
                continue

            self.active_labels.discard(label)
            self.last_stable_detections[label] = []

        return output

    def _filter_current_detections(
        self,
        detections: list[DetectionResult],
        frame_width: int,
        frame_height: int,
    ) -> list[DetectionResult]:
        frame_area = max(frame_width * frame_height, 1)
        filtered: list[DetectionResult] = []

        for detection in detections:
            label = detection.label.lower()
            if label == "person":
                if detection.confidence >= self.config.person_confidence:
                    filtered.append(detection)
                continue

            if label not in {"fire", "smoke"}:
                filtered.append(detection)
                continue

            min_confidence = self.config.fire_confidence if label == "fire" else self.config.smoke_confidence
            if detection.confidence < min_confidence:
                continue

            if not detection.boxes:
                continue

            largest_area = max(box.width * box.height for box in detection.boxes)
            if largest_area / frame_area < self.config.min_area_ratio:
                continue

            filtered.append(detection)

        return filtered

    def _stable_labels(self) -> set[str]:
        hits: dict[str, int] = {"fire": 0, "smoke": 0}

        for frame_detections in self.history:
            labels = {detection.label.lower() for detection in frame_detections}
            for label in hits:
                if label in labels:
                    hits[label] += 1

        return {label for label, count in hits.items() if count >= self.config.min_hits}
