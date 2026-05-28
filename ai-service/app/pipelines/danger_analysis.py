from dataclasses import dataclass
from math import hypot
from time import monotonic

from app.schemas.danger import DangerAnalysisResult, DangerZone, HumanRisk, RiskFactors, RiskLevel
from app.schemas.detection import BoundingBox, DetectionResult


@dataclass(frozen=True)
class DangerAnalysisConfig:
    zone_margin_ratio: float = 0.40
    center_distance_ratio: float = 0.18
    history_size: int = 30
    duration_saturation_seconds: float = 12.0
    fire_area_high_ratio: float = 0.12
    smoke_area_high_ratio: float = 0.25
    human_count_high: int = 3
    fire_area_weight: float = 0.25
    smoke_density_weight: float = 0.20
    duration_weight: float = 0.20
    human_nearby_weight: float = 0.20
    proximity_weight: float = 0.10
    consistency_weight: float = 0.05


class DangerAnalyzer:
    def __init__(self, config: DangerAnalysisConfig) -> None:
        self.config = config
        self.hazard_history: list[bool] = []
        self.hazard_started_at: float | None = None

    def analyze(
        self,
        detections: list[DetectionResult],
        frame_width: int,
        frame_height: int,
        timestamp: float | None = None,
    ) -> DangerAnalysisResult:
        now = monotonic() if timestamp is None else timestamp
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
        hazard_detected = fire_detected or smoke_detected
        duration_seconds = self._update_duration(hazard_detected, now)
        frame_consistency = self._update_consistency(hazard_detected)

        frame_area = max(frame_width * frame_height, 1)
        fire_area_ratio = _total_area_ratio(fire_boxes, frame_area)
        smoke_area_ratio = _total_area_ratio(smoke_boxes, frame_area)

        risk_factors = self._risk_factors(
            fire_area_ratio=fire_area_ratio,
            smoke_area_ratio=smoke_area_ratio,
            duration_seconds=duration_seconds,
            humans_nearby_count=len(humans_at_risk),
            humans_at_risk=humans_at_risk,
            frame_consistency=frame_consistency,
        )
        risk_score = self._risk_score(risk_factors)

        risk_level = self._risk_level(risk_score, fire_detected, smoke_detected, human_at_risk)
        return DangerAnalysisResult(
            risk_level=risk_level,
            risk_score=risk_score,
            status=self._status(risk_level, hazard_detected, human_at_risk),
            fire_detected=fire_detected,
            smoke_detected=smoke_detected,
            human_detected=human_detected,
            human_at_risk=human_at_risk,
            duration_seconds=duration_seconds,
            frame_consistency=frame_consistency,
            humans_detected_count=len(person_boxes),
            humans_nearby_count=len(humans_at_risk),
            fire_area_ratio=fire_area_ratio,
            smoke_area_ratio=smoke_area_ratio,
            risk_factors=risk_factors,
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

    def _update_duration(self, hazard_detected: bool, timestamp: float) -> float:
        if not hazard_detected:
            self.hazard_started_at = None
            return 0.0

        if self.hazard_started_at is None:
            self.hazard_started_at = timestamp

        return max(timestamp - self.hazard_started_at, 0.0)

    def _update_consistency(self, hazard_detected: bool) -> float:
        self.hazard_history.append(hazard_detected)
        if len(self.hazard_history) > self.config.history_size:
            self.hazard_history.pop(0)

        if not self.hazard_history:
            return 0.0

        return sum(self.hazard_history) / len(self.hazard_history)

    def _risk_factors(
        self,
        fire_area_ratio: float,
        smoke_area_ratio: float,
        duration_seconds: float,
        humans_nearby_count: int,
        humans_at_risk: list[HumanRisk],
        frame_consistency: float,
    ) -> RiskFactors:
        proximity_score = 0.0
        if humans_at_risk:
            proximity_scores = [
                100.0 if human.inside_danger_zone else _clamp01(1 - human.distance_ratio / self.config.center_distance_ratio) * 100
                for human in humans_at_risk
            ]
            proximity_score = max(proximity_scores)

        return RiskFactors(
            fire_area_score=_clamp01(fire_area_ratio / self.config.fire_area_high_ratio) * 100,
            smoke_density_score=_clamp01(smoke_area_ratio / self.config.smoke_area_high_ratio) * 100,
            duration_score=_clamp01(duration_seconds / self.config.duration_saturation_seconds) * 100,
            human_nearby_score=_clamp01(humans_nearby_count / max(self.config.human_count_high, 1)) * 100,
            proximity_score=proximity_score,
            consistency_score=_clamp01(frame_consistency) * 100,
        )

    def _risk_score(self, factors: RiskFactors) -> float:
        score = (
            factors.fire_area_score * self.config.fire_area_weight
            + factors.smoke_density_score * self.config.smoke_density_weight
            + factors.duration_score * self.config.duration_weight
            + factors.human_nearby_score * self.config.human_nearby_weight
            + factors.proximity_score * self.config.proximity_weight
            + factors.consistency_score * self.config.consistency_weight
        )
        return round(_clamp(score, 0.0, 100.0), 2)

    def _risk_level(
        self,
        risk_score: float,
        fire_detected: bool,
        smoke_detected: bool,
        human_at_risk: bool,
    ) -> RiskLevel:
        if (fire_detected and smoke_detected and human_at_risk) or risk_score >= 81:
            return RiskLevel.CRITICAL
        if human_at_risk or risk_score >= 61:
            return RiskLevel.HIGH
        if fire_detected or smoke_detected or risk_score >= 31:
            return RiskLevel.MEDIUM
        return RiskLevel.LOW

    @staticmethod
    def _status(risk_level: RiskLevel, hazard_detected: bool, human_at_risk: bool) -> str:
        if human_at_risk:
            return "HUMAN AT RISK"
        if risk_level == RiskLevel.CRITICAL:
            return "CRITICAL FIRE RISK"
        if risk_level in {RiskLevel.HIGH, RiskLevel.CRITICAL}:
            return "HIGH FIRE RISK"
        if risk_level == RiskLevel.MEDIUM:
            return "FIRE/SMOKE DETECTED"
        if hazard_detected:
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


def _total_area_ratio(boxes: list[BoundingBox], frame_area: int) -> float:
    total_area = sum(max(box.width, 0) * max(box.height, 0) for box in boxes)
    return _clamp01(total_area / frame_area)


def _clamp01(value: float) -> float:
    return _clamp(value, 0.0, 1.0)


def _clamp(value: float, lower: float, upper: float) -> float:
    return max(lower, min(value, upper))
