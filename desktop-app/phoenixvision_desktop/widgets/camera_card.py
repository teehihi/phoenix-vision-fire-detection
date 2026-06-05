from __future__ import annotations

from PySide6.QtCore import Qt, Signal
from PySide6.QtWidgets import QFrame, QGridLayout, QHBoxLayout, QLabel, QPushButton, QSizePolicy, QVBoxLayout

from phoenixvision_desktop.core.detection import count_labels, pixmap_from_bgr
from phoenixvision_desktop.core.models import CameraConfig, FramePacket


class CameraCard(QFrame):
    clicked = Signal(str)
    full_requested = Signal(str)

    def __init__(self, camera: CameraConfig) -> None:
        super().__init__()
        self.camera = camera
        self.setObjectName("cameraCard")
        self.setCursor(Qt.PointingHandCursor)
        self.setMinimumHeight(260)
        self.setSizePolicy(QSizePolicy.Expanding, QSizePolicy.Fixed)
        self._build_ui()

    def _build_ui(self) -> None:
        layout = QVBoxLayout(self)
        layout.setContentsMargins(0, 0, 0, 0)
        layout.setSpacing(0)

        self.video = QLabel()
        self.video.setObjectName("cameraVideo")
        self.video.setMinimumHeight(190)
        self.video.setAlignment(Qt.AlignCenter)
        layout.addWidget(self.video)

        self.overlay = QFrame(self.video)
        self.overlay.setObjectName("cardOverlay")
        overlay_layout = QVBoxLayout(self.overlay)
        overlay_layout.setContentsMargins(14, 12, 14, 12)

        top = QHBoxLayout()
        self.status_chip = QLabel(self.camera.status)
        self.status_chip.setObjectName("statusChip")
        self.risk_chip = QLabel(self.camera.risk_level)
        self.risk_chip.setObjectName("riskChip")
        top.addWidget(self.status_chip)
        top.addWidget(self.risk_chip)
        top.addStretch()
        full_button = QPushButton("View")
        full_button.setObjectName("ghostButton")
        full_button.clicked.connect(lambda: self.full_requested.emit(self.camera.camera_id))
        top.addWidget(full_button)
        overlay_layout.addLayout(top)
        overlay_layout.addStretch()
        overlay_layout.addLayout(self._bottom_overlay())

        metric_bar = QFrame()
        metric_bar.setObjectName("metricBar")
        metric_layout = QGridLayout(metric_bar)
        metric_layout.setContentsMargins(0, 0, 0, 0)
        metric_layout.setSpacing(0)
        self.risk_value = self._metric(metric_layout, "Risk", str(self.camera.risk_score), 0)
        self.people_value = self._metric(metric_layout, "People", "0", 1)
        self.fire_value = self._metric(metric_layout, "Fire", "0", 2)
        self.smoke_value = self._metric(metric_layout, "Smoke", "0", 3)
        layout.addWidget(metric_bar)

        if self.camera.is_local:
            self.video.setText("Press Start to open webcam")
        else:
            self.video.setText("Camera waiting for stream configuration")

    def _bottom_overlay(self) -> QHBoxLayout:
        bottom = QHBoxLayout()
        name_box = QFrame()
        name_box.setObjectName("videoPill")
        name_layout = QVBoxLayout(name_box)
        name_layout.setContentsMargins(12, 8, 12, 8)
        name_layout.addWidget(QLabel(self.camera.name))
        area = QLabel(self.camera.area)
        area.setObjectName("mutedText")
        name_layout.addWidget(area)
        bottom.addWidget(name_box)
        bottom.addStretch()
        self.fps_box = QLabel(f"{self.camera.fps:.1f} FPS\n{self.camera.source_type}")
        self.fps_box.setObjectName("fpsPill")
        bottom.addWidget(self.fps_box)
        return bottom

    def resizeEvent(self, event) -> None:
        super().resizeEvent(event)
        self.overlay.setGeometry(0, 0, self.width(), self.video.height())

    def mousePressEvent(self, event) -> None:
        if event.button() == Qt.LeftButton:
            self.clicked.emit(self.camera.camera_id)
        super().mousePressEvent(event)

    def set_selected(self, selected: bool) -> None:
        self.setProperty("selected", selected)
        self.style().unpolish(self)
        self.style().polish(self)

    def set_frame(self, frame_bgr) -> None:
        self.video.setPixmap(pixmap_from_bgr(frame_bgr, self.video.size()))

    def set_stats(self, packet: FramePacket) -> None:
        analysis = packet.analysis
        self.risk_chip.setText(str(analysis.risk_level))
        self.risk_value.setText(f"{analysis.risk_score:.0f}")
        self.people_value.setText(str(analysis.humans_detected_count))
        self.fire_value.setText(str(count_labels(packet.detections, {"fire"})))
        self.smoke_value.setText(str(count_labels(packet.detections, {"smoke"})))
        self.fps_box.setText(f"{packet.fps:.1f} FPS\nWEBCAM")

    @staticmethod
    def _metric(layout: QGridLayout, label: str, value: str, column: int) -> QLabel:
        box = QFrame()
        box.setObjectName("metricCell")
        box_layout = QVBoxLayout(box)
        box_layout.setContentsMargins(6, 9, 6, 9)
        name = QLabel(label)
        name.setObjectName("metricName")
        number = QLabel(value)
        number.setObjectName("metricValue")
        name.setAlignment(Qt.AlignCenter)
        number.setAlignment(Qt.AlignCenter)
        box_layout.addWidget(name)
        box_layout.addWidget(number)
        layout.addWidget(box, 0, column)
        return number
