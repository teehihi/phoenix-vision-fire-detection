from dataclasses import dataclass
from math import hypot

from app.schemas.danger import DangerAnalysisResult, DangerZone, HumanRisk, RiskLevel
from app.schemas.detection import BoundingBox, DetectionResult


@dataclass(frozen=True)
class DangerAnalysisConfig:
    zone_margin_ratio: float = 0.40
    center_distance_ratio: float = 0.18


class DangerAnalyzer:
    def __init__(self, config: DangerAnalysisConfig) -> None:
        self.config = config

    def analyze(
        self,
        detections: list[DetectionResult],
        frame_width: int,
        frame_height: int,
    ) -> DangerAnalysisResult:
        fire_boxes = _boxes_for_labels(detections, {"fire"})
        smoke_boxes = _boxes_for_labels(detections, {"smoke"})
        person_boxes = _boxes_for_labels(detections, {"person"})

        danger_zones = [
            self._build_zone(detection, box, frame_width, frame_height)
            for detection in detections
            if detection.label.lower() in {"fire", "smoke"}
            for box in detection.boxes
        ]

        humans_at_risk = [
            human_risk
            for person_box in person_boxes
            if (human_risk := self._evaluate_person(person_box, danger_zones, frame_width, frame_height)) is not None
        ]

        fire_detected = bool(fire_boxes)
        smoke_detected = bool(smoke_boxes)
        human_detected = bool(person_boxes)
        human_at_risk = bool(humans_at_risk)

        risk_level = self._risk_level(fire_detected, smoke_detected, human_detected, human_at_risk)
        return DangerAnalysisResult(
            risk_level=risk_level,
            status=self._status(risk_level),
            fire_detected=fire_detected,
            smoke_detected=smoke_detected,
            human_detected=human_detected,
            human_at_risk=human_at_risk,
            danger_zones=danger_zones,
            humans_at_risk=humans_at_risk,
        )

    def _build_zone(
        self,
        detection: DetectionResult,
        box: BoundingBox,
        frame_width: int,
        frame_height: int,
    ) -> DangerZone:
        margin_x = box.width * self.config.zone_margin_ratio
        margin_y = box.height * self.config.zone_margin_ratio
        x = max(box.x - margin_x, 0)
        y = max(box.y - margin_y, 0)
        x2 = min(box.x + box.width + margin_x, frame_width)
        y2 = min(box.y + box.height + margin_y, frame_height)

        return DangerZone(
            source_label=detection.label,
            confidence=detection.confidence,
            box=BoundingBox(x=x, y=y, width=max(x2 - x, 0), height=max(y2 - y, 0)),
        )

    def _evaluate_person(
        self,
        person_box: BoundingBox,
        zones: list[DangerZone],
        frame_width: int,
        frame_height: int,
    ) -> HumanRisk | None:
        if not zones:
            return None

        person_center = _center(person_box)
        frame_diagonal = max(hypot(frame_width, frame_height), 1.0)
        nearest_zone = min(zones, key=lambda zone: _distance(person_center, _center(zone.box)))
        distance_ratio = _distance(person_center, _center(nearest_zone.box)) / frame_diagonal
        inside_zone = _point_inside(person_center, nearest_zone.box)

        if not inside_zone and distance_ratio > self.config.center_distance_ratio:
            return None

        return HumanRisk(
            person_box=person_box,
            nearest_zone=nearest_zone,
            distance_ratio=distance_ratio,
            inside_danger_zone=inside_zone,
        )

    @staticmethod
    def _risk_level(
        fire_detected: bool,
        smoke_detected: bool,
        human_detected: bool,
        human_at_risk: bool,
    ) -> RiskLevel:
        if fire_detected and smoke_detected and human_at_risk:
            return RiskLevel.CRITICAL
        if fire_detected and human_at_risk:
            return RiskLevel.HIGH
        if smoke_detected and human_at_risk:
            return RiskLevel.HIGH
        if fire_detected or smoke_detected:
            return RiskLevel.MEDIUM if human_detected else RiskLevel.LOW
        return RiskLevel.SAFE

    @staticmethod
    def _status(risk_level: RiskLevel) -> str:
        if risk_level in {RiskLevel.HIGH, RiskLevel.CRITICAL}:
            return "HUMAN AT RISK"
        if risk_level == RiskLevel.MEDIUM:
            return "FIRE/SMOKE DETECTED"
        if risk_level == RiskLevel.LOW:
            return "MONITORING FIRE/SMOKE"
        return "SAFE"


def _boxes_for_labels(detections: list[DetectionResult], labels: set[str]) -> list[BoundingBox]:
    return [box for detection in detections if detection.label.lower() in labels for box in detection.boxes]


def _center(box: BoundingBox) -> tuple[float, float]:
    return box.x + box.width / 2, box.y + box.height / 2


def _distance(point_a: tuple[float, float], point_b: tuple[float, float]) -> float:
    return hypot(point_a[0] - point_b[0], point_a[1] - point_b[1])


def _point_inside(point: tuple[float, float], box: BoundingBox) -> bool:
    return box.x <= point[0] <= box.x + box.width and box.y <= point[1] <= box.y + box.height
