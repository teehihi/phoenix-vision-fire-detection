from __future__ import annotations

from pathlib import Path

from PySide6.QtWidgets import QApplication

from phoenixvision_desktop.core.camera_registry import CameraRegistry, default_cameras
from phoenixvision_desktop.core.models import CameraConfig
from phoenixvision_desktop.widgets.camera_manager import CameraEditorDialog


def app() -> QApplication:
    return QApplication.instance() or QApplication([])


def test_default_registry_starts_with_local_webcam_only() -> None:
    cameras = default_cameras()

    assert len(cameras) == 1
    assert cameras[0].camera_id == "local"
    assert cameras[0].source_type == "WEBCAM"


def test_camera_registry_persists_user_entered_camera(tmp_path: Path) -> None:
    registry = CameraRegistry(tmp_path / "cameras.json")
    camera = CameraConfig(
        camera_id="cam-1",
        name="Camera cua chinh",
        area="Nha",
        source_type="HIKVISION",
        status="Sẵn sàng",
        risk_level="LOW",
        risk_score=0,
        fps=0.0,
        source_value="192.168.1.104",
        host="192.168.1.104",
        username="admin",
        password="secret",
        channel="101",
    )

    registry.save([camera])

    [loaded] = registry.load()
    assert loaded.name == "Camera cua chinh"
    assert loaded.stream_source() == "rtsp://admin:secret@192.168.1.104:554/Streaming/Channels/101"


def test_hikvision_editor_is_empty_input_form() -> None:
    app()
    dialog = CameraEditorDialog()

    assert dialog.source_type.currentText() == "HIKVISION"
    assert dialog.source_value.text() == ""
    assert dialog.host.text() == ""
    assert dialog.channel.text() == "101"
