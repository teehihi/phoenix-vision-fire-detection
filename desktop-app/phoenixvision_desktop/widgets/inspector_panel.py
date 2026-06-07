from __future__ import annotations

from PySide6.QtCore import Qt, Signal
from PySide6.QtWidgets import QFrame, QGridLayout, QHBoxLayout, QLabel, QPushButton, QVBoxLayout

from phoenixvision_desktop.core.models import CameraConfig, FramePacket
from phoenixvision_desktop.core.styles import apply_soft_shadow


class InspectorPanel(QFrame):
    closed = Signal()

    def __init__(self) -> None:
        super().__init__()
        self.setObjectName("panel")
        apply_soft_shadow(self, blur_radius=20, y_offset=6, alpha=22)
        self._build_ui()

    def _build_ui(self) -> None:
        layout = QVBoxLayout(self)
        layout.setContentsMargins(20, 20, 20, 20)
        layout.setSpacing(14)
        layout.addLayout(self._header())
        layout.addWidget(self._risk_box())
        layout.addLayout(self._metric_grid())
        layout.addWidget(self._connection_box())
        layout.addStretch()

    def _header(self) -> QHBoxLayout:
        head = QHBoxLayout()
        title_box = QVBoxLayout()
        caption = QLabel("CAMERA ĐANG CHỌN")
        caption.setObjectName("caption")
        self.title = QLabel("Webcam local")
        self.title.setObjectName("panelTitle")
        self.area = QLabel("Máy hiện tại")
        self.area.setObjectName("mutedText")
        title_box.addWidget(caption)
        title_box.addWidget(self.title)
        title_box.addWidget(self.area)
        head.addLayout(title_box)
        head.addStretch()

        close = QPushButton("×")
        close.setObjectName("iconButton")
        close.setCursor(Qt.PointingHandCursor)
        close.setFixedSize(44, 44)
        close.clicked.connect(self.closed.emit)
        head.addWidget(close)
        return head

    def _risk_box(self) -> QFrame:
        risk_box = QFrame()
        risk_box.setObjectName("softBox")
        risk_layout = QVBoxLayout(risk_box)
        risk_top = QHBoxLayout()
        self.risk = QLabel("LOW")
        self.risk.setObjectName("riskPill")
        self.score = QLabel("0")
        self.score.setObjectName("bigScore")
        risk_top.addWidget(self.risk)
        risk_top.addStretch()
        risk_top.addWidget(self.score)
        risk_layout.addLayout(risk_top)

        self.risk_bar = QFrame()
        self.risk_bar.setObjectName("riskBar")
        self.risk_bar.setFixedHeight(8)
        risk_layout.addWidget(self.risk_bar)

        self.status = QLabel("Chưa phát hiện người trong vùng nguy hiểm.")
        self.status.setObjectName("mutedText")
        risk_layout.addWidget(self.status)
        return risk_box

    def _metric_grid(self) -> QGridLayout:
        grid = QGridLayout()
        grid.setSpacing(12)
        self.fps = self._metric(grid, "FPS", "--", 0, 0)
        self.updated = self._metric(grid, "Updated", "--", 0, 1)
        self.people = self._metric(grid, "People", "0", 1, 0)
        self.at_risk = self._metric(grid, "At risk", "0", 1, 1)
        return grid

    def _connection_box(self) -> QFrame:
        connection = QFrame()
        connection.setObjectName("softBox")
        connection_layout = QVBoxLayout(connection)
        title = QLabel("Trạng thái kết nối")
        title.setObjectName("sectionTitle")
        self.connection = QLabel("Đang chờ stream local.")
        self.connection.setObjectName("mutedText")
        connection_layout.addWidget(title)
        connection_layout.addWidget(self.connection)
        return connection

    def set_camera(self, camera: CameraConfig) -> None:
        self.title.setText(camera.name)
        self.area.setText(camera.area)
        self.risk.setText(camera.risk_level)
        self.score.setText(str(camera.risk_score))
        self.fps.setText(f"{camera.fps:.1f}")
        self.updated.setText("Đang chờ")
        self.people.setText("0")
        self.at_risk.setText("0")
        self.connection.setText(f"{camera.source_type} | {camera.display_source()}")

    def set_packet(self, packet: FramePacket) -> None:
        analysis = packet.analysis
        self.risk.setText(str(analysis.risk_level))
        self.score.setText(f"{analysis.risk_score:.0f}")
        self.status.setText(
            "Có người trong vùng nguy hiểm." if analysis.human_at_risk else "Chưa phát hiện người trong vùng nguy hiểm."
        )
        self.fps.setText(f"{packet.fps:.1f}")
        self.updated.setText(packet.timestamp.strftime("%H:%M:%S"))
        self.people.setText(str(analysis.humans_detected_count))
        self.at_risk.setText(str(analysis.humans_nearby_count))
        self.connection.setText("Camera stream đã kết nối.")

    @staticmethod
    def _metric(layout: QGridLayout, label: str, value: str, row: int, column: int) -> QLabel:
        box = QFrame()
        box.setObjectName("softBox")
        box_layout = QVBoxLayout(box)
        box_layout.setContentsMargins(14, 12, 14, 12)
        name = QLabel(label)
        name.setObjectName("metricName")
        number = QLabel(value)
        number.setObjectName("metricValue")
        box_layout.addWidget(name)
        box_layout.addWidget(number)
        layout.addWidget(box, row, column)
        return number
