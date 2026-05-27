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


def test_human_far_from_fire_is_not_at_risk() -> None:
    analyzer = DangerAnalyzer(DangerAnalysisConfig(zone_margin_ratio=0.2, center_distance_ratio=0.05))
    detections = [
        _detection("fire", 0.9, 30, 30, 80, 80),
        _detection("person", 0.8, 500, 300, 60, 160),
    ]

    analysis = analyzer.analyze(detections, frame_width=640, frame_height=480)

    assert analysis.human_at_risk is False
    assert analysis.risk_level == RiskLevel.MEDIUM


def _detection(label: str, confidence: float, x: float, y: float, width: float, height: float) -> DetectionResult:
    return DetectionResult(
        label=label,
        confidence=confidence,
        boxes=[BoundingBox(x=x, y=y, width=width, height=height)],
    )
