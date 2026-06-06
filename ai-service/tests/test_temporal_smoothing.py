from app.pipelines.temporal_smoothing import StableDetectionConfig, TemporalDetectionSmoother
from app.schemas.detection import BoundingBox, DetectionResult


def test_uses_separate_thresholds_for_fire_smoke_and_person() -> None:
    smoother = TemporalDetectionSmoother(
        StableDetectionConfig(
            window_size=1,
            min_hits=1,
            fire_confidence=0.70,
            smoke_confidence=0.60,
            person_confidence=0.50,
            min_area_ratio=0.0,
        )
    )

    output = smoother.update(
        [
            _detection("fire", 0.69),
            _detection("smoke", 0.61),
            _detection("person", 0.49),
        ],
        frame_width=640,
        frame_height=480,
    )

    assert [detection.label for detection in output] == ["smoke"]


def test_requires_multiple_frames_before_hazard_is_stable() -> None:
    smoother = TemporalDetectionSmoother(
        StableDetectionConfig(
            window_size=3,
            min_hits=2,
            fire_confidence=0.50,
            min_area_ratio=0.0,
        )
    )
    fire = _detection("fire", 0.90)

    first = smoother.update([fire], frame_width=640, frame_height=480)
    second = smoother.update([fire], frame_width=640, frame_height=480)

    assert first == []
    assert [detection.label for detection in second] == ["fire"]


def test_cooldown_prevents_alert_flicker_after_short_miss() -> None:
    smoother = TemporalDetectionSmoother(
        StableDetectionConfig(
            window_size=1,
            min_hits=1,
            fire_confidence=0.50,
            min_area_ratio=0.0,
            cooldown_frames=2,
        )
    )
    fire = _detection("fire", 0.90)

    stable = smoother.update([fire], frame_width=640, frame_height=480)
    first_miss = smoother.update([], frame_width=640, frame_height=480)
    second_miss = smoother.update([], frame_width=640, frame_height=480)
    expired = smoother.update([], frame_width=640, frame_height=480)

    assert [detection.label for detection in stable] == ["fire"]
    assert [detection.label for detection in first_miss] == ["fire"]
    assert [detection.label for detection in second_miss] == ["fire"]
    assert expired == []


def test_drops_tiny_hazard_boxes_before_risk_analysis() -> None:
    smoother = TemporalDetectionSmoother(
        StableDetectionConfig(
            window_size=1,
            min_hits=1,
            fire_confidence=0.50,
            min_area_ratio=0.01,
        )
    )

    output = smoother.update(
        [_detection("fire", 0.90, width=10, height=10)],
        frame_width=640,
        frame_height=480,
    )

    assert output == []


def _detection(
    label: str,
    confidence: float,
    width: float = 100,
    height: float = 100,
) -> DetectionResult:
    return DetectionResult(
        label=label,
        confidence=confidence,
        boxes=[BoundingBox(x=10, y=10, width=width, height=height)],
    )
