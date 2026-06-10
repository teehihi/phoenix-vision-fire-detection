from app.pipelines.temporal_smoothing import StableDetectionConfig, TemporalDetectionSmoother
from app.schemas.detection import BoundingBox, DetectionResult


def test_uses_separate_thresholds_for_fire_smoke_and_person() -> None:
    smoother = TemporalDetectionSmoother(
        StableDetectionConfig(
            window_size=1,
            min_hits=1,
            fire_confidence=0.70,
            supported_fire_confidence=0.70,
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


def test_default_thresholds_reject_skin_fire_and_keep_stable_smoke() -> None:
    fire_smoother = TemporalDetectionSmoother(StableDetectionConfig(min_area_ratio=0.0))
    weak_fire = _detection("fire", 0.54)

    for _ in range(3):
        fire_output = fire_smoother.update([weak_fire], frame_width=640, frame_height=480)

    assert fire_output == []

    smoke_smoother = TemporalDetectionSmoother(StableDetectionConfig(min_area_ratio=0.0))
    smoke = _detection("smoke", 0.25)

    first = smoke_smoother.update([smoke], frame_width=640, frame_height=480)
    second = smoke_smoother.update([smoke], frame_width=640, frame_height=480)
    third = smoke_smoother.update([smoke], frame_width=640, frame_height=480)

    assert first == []
    assert second == []
    assert [detection.label for detection in third] == ["smoke"]


def test_smoke_supports_low_confidence_fire_and_fire_takes_priority() -> None:
    smoother = TemporalDetectionSmoother(StableDetectionConfig(min_area_ratio=0.0))
    fire = _detection("fire", 0.35)
    smoke = _detection("smoke", 0.25)

    first = smoother.update([fire, smoke], frame_width=640, frame_height=480)
    second = smoother.update([fire, smoke], frame_width=640, frame_height=480)
    third = smoother.update([fire, smoke], frame_width=640, frame_height=480)

    assert first == []
    assert second == []
    assert [detection.label for detection in third] == ["fire"]


def test_rejects_stable_but_weak_smoke() -> None:
    smoother = TemporalDetectionSmoother(StableDetectionConfig(min_area_ratio=0.0))
    weak_smoke = _detection("smoke", 0.13)

    for _ in range(5):
        output = smoother.update([weak_smoke], frame_width=640, frame_height=480)

    assert output == []


def test_rejects_extremely_wide_smoke_box_like_clothing() -> None:
    smoother = TemporalDetectionSmoother(StableDetectionConfig(min_area_ratio=0.0))
    clothing = _detection("smoke", 0.30, width=500, height=80)

    for _ in range(5):
        output = smoother.update([clothing], frame_width=1280, frame_height=720)

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
