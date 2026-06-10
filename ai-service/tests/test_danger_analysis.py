from app.pipelines.danger_analysis import DangerAnalysisConfig, DangerAnalyzer
from app.schemas.danger import RiskLevel
from app.schemas.detection import BoundingBox, DetectionResult


def test_human_near_fire_is_at_risk() -> None:
    analyzer = DangerAnalyzer(DangerAnalysisConfig(zone_margin_ratio=0.5, center_distance_ratio=0.2))
    detections = [
        _detection("fire", 0.9, 100, 100, 100, 100),
        _detection("person", 0.8, 145, 120, 60, 160),
    ]

    analysis = analyzer.analyze(detections, frame_width=640, frame_height=480)

    assert analysis.human_at_risk is True
    assert analysis.status == "HUMAN AT RISK"
    assert analysis.risk_level == RiskLevel.HIGH
    assert analysis.risk_score > 0
    assert analysis.humans_nearby_count == 1


def test_human_far_from_fire_is_not_at_risk() -> None:
    analyzer = DangerAnalyzer(DangerAnalysisConfig(zone_margin_ratio=0.2, center_distance_ratio=0.05))
    detections = [
        _detection("fire", 0.9, 30, 30, 80, 80),
        _detection("person", 0.8, 500, 300, 60, 160),
    ]

    analysis = analyzer.analyze(detections, frame_width=640, frame_height=480)

    assert analysis.human_at_risk is False
    assert analysis.risk_level == RiskLevel.MEDIUM


def test_risk_score_increases_with_duration_and_consistency() -> None:
    analyzer = DangerAnalyzer(
        DangerAnalysisConfig(
            duration_saturation_seconds=10,
            fire_area_high_ratio=0.10,
            history_size=5,
        )
    )
    detections = [_detection("fire", 0.9, 0, 0, 160, 120)]

    first = analyzer.analyze(detections, frame_width=640, frame_height=480, timestamp=0.0)
    later = analyzer.analyze(detections, frame_width=640, frame_height=480, timestamp=8.0)

    assert later.risk_score > first.risk_score
    assert later.duration_seconds == 8.0
    assert later.frame_consistency == 1.0
    assert later.risk_factors.duration_score == 80.0


def test_smoke_only_is_reported_as_possible_fire() -> None:
    analyzer = DangerAnalyzer(DangerAnalysisConfig())

    analysis = analyzer.analyze(
        [_detection("smoke", 0.30, 20, 20, 120, 160)],
        frame_width=640,
        frame_height=480,
    )

    assert analysis.risk_level == RiskLevel.MEDIUM
    assert analysis.smoke_detected is True
    assert analysis.fire_detected is False
    assert analysis.status == "SMOKE DETECTED - POSSIBLE FIRE"


def _detection(label: str, confidence: float, x: float, y: float, width: float, height: float) -> DetectionResult:
    return DetectionResult(
        label=label,
        confidence=confidence,
        boxes=[BoundingBox(x=x, y=y, width=width, height=height)],
    )
