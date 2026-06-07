from __future__ import annotations

import argparse
from dataclasses import replace
from datetime import datetime
from pathlib import Path
import time

from PySide6.QtCore import QThread, Qt
from PySide6.QtGui import QCloseEvent
from PySide6.QtWidgets import (
    QComboBox,
    QDialog,
    QFrame,
    QGridLayout,
    QHBoxLayout,
    QLabel,
    QLineEdit,
    QListWidget,
    QMainWindow,
    QMessageBox,
    QPushButton,
    QScrollArea,
    QSpinBox,
    QVBoxLayout,
    QWidget,
)

from app.schemas.danger import RiskLevel

from phoenixvision_desktop.core.camera_registry import CameraRegistry
from phoenixvision_desktop.core.models import CameraConfig, FramePacket
from phoenixvision_desktop.core.styles import APP_STYLESHEET, apply_soft_shadow
from phoenixvision_desktop.widgets.camera_card import CameraCard
from phoenixvision_desktop.widgets.camera_manager import CameraManagerDialog
from phoenixvision_desktop.widgets.inspector_panel import InspectorPanel
from phoenixvision_desktop.widgets.sidebar import Sidebar
from phoenixvision_desktop.workers.camera_worker import CameraWorker


class PhoenixVisionWindow(QMainWindow):
    def __init__(self, args: argparse.Namespace) -> None:
        super().__init__()
        self.args = args
        self.worker_thread: QThread | None = None
        self.worker: CameraWorker | None = None
        self.selected_camera_id = "local"
        self.active_camera_id = ""
        self.last_event_key = ""
        self.last_event_at = 0.0
        self.cards: dict[str, CameraCard] = {}
        self.registry = CameraRegistry()
        self.cameras = self.registry.load()

        self.setWindowTitle("PhoenixVision")
        self.resize(1480, 900)
        self.setMinimumSize(1180, 760)
        self._build_ui()
        self.setStyleSheet(APP_STYLESHEET)
        self._refresh_camera_grid()
        self._select_camera(self.cameras[0].camera_id)

    def _build_ui(self) -> None:
        central = QWidget()
        root = QHBoxLayout(central)
        root.setContentsMargins(0, 0, 0, 0)
        root.setSpacing(0)
        self.setCentralWidget(central)

        root.addWidget(Sidebar())
        content = QWidget()
        content.setObjectName("content")
        content_layout = QVBoxLayout(content)
        content_layout.setContentsMargins(28, 28, 28, 28)
        content_layout.setSpacing(20)
        root.addWidget(content, 1)

        content_layout.addWidget(self._header())
        content_layout.addWidget(self._toolbar())
        content_layout.addLayout(self._main_area(), 1)
        self.summary = QLabel()
        self.summary.setObjectName("summary")
        content_layout.addWidget(self.summary)

    def _header(self) -> QWidget:
        header = QFrame()
        header.setObjectName("panel")
        apply_soft_shadow(header)
        layout = QHBoxLayout(header)
        layout.setContentsMargins(24, 22, 24, 22)

        text = QVBoxLayout()
        caption = QLabel("PHOENIXVISION CONTROL CENTER")
        caption.setObjectName("captionOrange")
        title = QLabel("Quản lý camera trực tiếp")
        title.setObjectName("pageTitle")
        subtitle = QLabel("Theo dõi nhiều camera, phân tích cháy khói và cảnh báo rủi ro theo thời gian thực.")
        subtitle.setObjectName("mutedText")
        text.addWidget(caption)
        text.addWidget(title)
        text.addWidget(subtitle)
        layout.addLayout(text)
        layout.addStretch()

        self.camera_index = QSpinBox()
        self.camera_index.setRange(0, 8)
        self.camera_index.setValue(self.args.camera)
        self.camera_index.setObjectName("inputSmall")
        self.fire_confidence = self._confidence_input(self.args.fire_confidence)
        self.smoke_confidence = self._confidence_input(self.args.smoke_confidence)
        self.person_confidence = self._confidence_input(self.args.person_confidence)

        self.start_button = QPushButton("Start")
        self.start_button.setObjectName("primaryButton")
        self.stop_button = QPushButton("Stop")
        self.stop_button.setObjectName("secondaryButton")
        self.start_button.setCursor(Qt.PointingHandCursor)
        self.stop_button.setCursor(Qt.PointingHandCursor)
        self.start_button.clicked.connect(self.start_stream)
        self.stop_button.clicked.connect(self.stop_stream)

        layout.addWidget(QLabel("Camera"))
        layout.addWidget(self.camera_index)
        layout.addWidget(QLabel("Fire %"))
        layout.addWidget(self.fire_confidence)
        layout.addWidget(QLabel("Smoke %"))
        layout.addWidget(self.smoke_confidence)
        layout.addWidget(QLabel("Person %"))
        layout.addWidget(self.person_confidence)
        layout.addWidget(self.start_button)
        layout.addWidget(self.stop_button)
        return header

    @staticmethod
    def _confidence_input(value: float) -> QSpinBox:
        field = QSpinBox()
        field.setRange(10, 95)
        field.setValue(round(value * 100))
        field.setSuffix("%")
        field.setObjectName("inputSmall")
        return field

    def _toolbar(self) -> QWidget:
        toolbar = QFrame()
        toolbar.setObjectName("panel")
        apply_soft_shadow(toolbar, blur_radius=20, y_offset=6, alpha=22)
        layout = QHBoxLayout(toolbar)
        layout.setContentsMargins(18, 14, 18, 14)
        self.search = QLineEdit()
        self.search.setPlaceholderText("Tìm theo tên camera, khu vực hoặc nhóm...")
        self.search.setObjectName("search")
        filter_box = QComboBox()
        filter_box.addItems(["Tất cả camera", "Đang hoạt động", "Cần chú ý", "Mất kết nối"])
        filter_box.setObjectName("combo")
        add_camera = QPushButton("Quản lý camera")
        add_camera.setObjectName("primaryButton")
        add_camera.setCursor(Qt.PointingHandCursor)
        add_camera.clicked.connect(self._show_camera_manager)
        self.filter_box = filter_box
        self.search.textChanged.connect(self._refresh_camera_grid)
        self.filter_box.currentTextChanged.connect(self._refresh_camera_grid)
        layout.addWidget(self.search, 1)
        layout.addWidget(filter_box)
        layout.addWidget(add_camera)
        return toolbar

    def _main_area(self) -> QHBoxLayout:
        main = QHBoxLayout()
        main.setSpacing(20)

        self.scroll = QScrollArea()
        self.scroll.setWidgetResizable(True)
        self.scroll.setObjectName("scroll")
        grid_host = QWidget()
        self.grid = QGridLayout(grid_host)
        self.grid.setContentsMargins(0, 0, 0, 0)
        self.grid.setSpacing(18)
        self.scroll.setWidget(grid_host)
        main.addWidget(self.scroll, 1)

        right = QVBoxLayout()
        right.setSpacing(18)
        self.inspector = InspectorPanel()
        self.inspector.closed.connect(self.inspector.hide)
        right.addWidget(self.inspector)
        right.addWidget(self._timeline_box(), 1)
        main.addLayout(right, 0)
        return main

    def _timeline_box(self) -> QWidget:
        timeline_box = QFrame()
        timeline_box.setObjectName("panel")
        apply_soft_shadow(timeline_box, blur_radius=20, y_offset=6, alpha=22)
        timeline_layout = QVBoxLayout(timeline_box)
        timeline_layout.setContentsMargins(18, 18, 18, 18)
        title = QLabel("Incident timeline")
        title.setObjectName("sectionTitle")
        self.timeline = QListWidget()
        self.timeline.setObjectName("timeline")
        timeline_layout.addWidget(title)
        timeline_layout.addWidget(self.timeline)
        return timeline_box

    def start_stream(self) -> None:
        if self.worker_thread and self.worker_thread.isRunning():
            return

        camera = self._selected_camera()
        if camera.camera_id == "local" and camera.source_type == "WEBCAM":
            camera = replace(camera, source_value=str(self.camera_index.value()))
        if not camera.enabled:
            QMessageBox.warning(self, "Camera đang tắt", f"{camera.name} đang bị tắt. Hãy bật trong Quản lý camera.")
            return

        if not Path(self.args.fire_model).exists():
            QMessageBox.critical(self, "Missing model", f"Cannot find fire model:\n{self.args.fire_model}")
            return

        self.active_camera_id = camera.camera_id
        self.worker_thread = QThread()
        self.worker = CameraWorker(
            camera=camera,
            fire_model_path=self.args.fire_model,
            person_model_path=self.args.person_model,
            fire_confidence=self.fire_confidence.value() / 100,
            smoke_confidence=self.smoke_confidence.value() / 100,
            person_confidence=self.person_confidence.value() / 100,
            smoothing_window=self.args.smoothing_window,
            stable_frames=self.args.stable_frames,
            cooldown_frames=self.args.cooldown_frames,
        )
        self.worker.moveToThread(self.worker_thread)
        self.worker_thread.started.connect(self.worker.run)
        self.worker.frame_ready.connect(self._handle_packet)
        self.worker.failed.connect(self._handle_error)
        self.worker.finished.connect(self.worker_thread.quit)
        self.worker.finished.connect(self.worker.deleteLater)
        self.worker_thread.finished.connect(self._clear_worker)
        self.worker_thread.finished.connect(self.worker_thread.deleteLater)
        self.worker_thread.start()

    def stop_stream(self) -> None:
        if self.worker:
            self.worker.stop()
        self._add_event("System", "Camera stream stopped.")

    def closeEvent(self, event: QCloseEvent) -> None:
        self.stop_stream()
        super().closeEvent(event)

    def _handle_packet(self, packet: FramePacket) -> None:
        card = self.cards.get(packet.camera_id)
        if card:
            card.set_frame(packet.frame_bgr)
            card.set_stats(packet)
        if self.selected_camera_id == packet.camera_id:
            self.inspector.set_packet(packet)
        self._maybe_log_incident(packet)

    def _handle_error(self, message: str) -> None:
        self._add_event("Camera", message)
        self.inspector.connection.setText(message)
        card = self.cards.get(self.active_camera_id or self.selected_camera_id)
        if card:
            card.video.setText("Camera connection failed")

    def _clear_worker(self) -> None:
        self.worker = None
        self.worker_thread = None

    def _select_camera(self, camera_id: str) -> None:
        self.selected_camera_id = camera_id
        for card_id, card in self.cards.items():
            card.set_selected(card_id == camera_id)
        camera = self._camera_by_id(camera_id)
        self.inspector.set_camera(camera)
        self.inspector.show()

    def _open_full_view(self, camera_id: str) -> None:
        camera = self._camera_by_id(camera_id)
        dialog = QDialog(self)
        dialog.setObjectName("cameraDialog")
        dialog.setWindowTitle(camera.name)
        dialog.resize(1100, 720)
        layout = QVBoxLayout(dialog)
        layout.setContentsMargins(22, 22, 22, 22)
        layout.setSpacing(14)
        panel = QFrame()
        panel.setObjectName("dialogPanel")
        apply_soft_shadow(panel, blur_radius=28, y_offset=10, alpha=30)
        panel_layout = QVBoxLayout(panel)
        panel_layout.setContentsMargins(20, 20, 20, 20)
        panel_layout.setSpacing(14)
        title = QLabel(f"{camera.name} | {camera.area} | {camera.display_source()}")
        title.setObjectName("sectionTitle")
        preview = QLabel("Start camera stream để xem fullscreen.")
        preview.setObjectName("cameraVideo")
        preview.setAlignment(Qt.AlignCenter)
        preview.setMinimumHeight(620)
        card = self.cards.get(camera_id)
        if card and card.video.pixmap():
            preview.setPixmap(card.video.pixmap().scaled(preview.size(), Qt.KeepAspectRatio, Qt.SmoothTransformation))
        panel_layout.addWidget(title)
        panel_layout.addWidget(preview, 1)
        layout.addWidget(panel)
        dialog.exec()

    def _show_camera_manager(self) -> None:
        dialog = CameraManagerDialog(self.cameras, self)
        if dialog.exec() == QDialog.Accepted:
            self.cameras = dialog.cameras
            self.registry.save(self.cameras)
            if self.selected_camera_id not in {camera.camera_id for camera in self.cameras}:
                self.selected_camera_id = self.cameras[0].camera_id
            self._refresh_camera_grid()
            self._select_camera(self.selected_camera_id)

    def _maybe_log_incident(self, packet: FramePacket) -> None:
        analysis = packet.analysis
        if analysis.risk_level == RiskLevel.LOW and not analysis.fire_detected and not analysis.smoke_detected:
            return

        event_key = f"{analysis.risk_level}:{analysis.status}:{analysis.humans_nearby_count}"
        now = time.perf_counter()
        if event_key == self.last_event_key and now - self.last_event_at < 5.0:
            return

        self.last_event_key = event_key
        self.last_event_at = now
        self._add_event(
            str(analysis.risk_level),
            f"{analysis.status} | score {analysis.risk_score:.0f} | people {analysis.humans_detected_count}",
        )

    def _add_event(self, kind: str, text: str) -> None:
        timestamp = datetime.now().strftime("%H:%M:%S")
        self.timeline.insertItem(0, f"{timestamp}  [{kind}]  {text}")
        while self.timeline.count() > 80:
            self.timeline.takeItem(self.timeline.count() - 1)

    def _refresh_camera_grid(self) -> None:
        for card in self.cards.values():
            self.grid.removeWidget(card)
            card.deleteLater()
        self.cards = {}

        cameras = self._filtered_cameras()
        for index, camera in enumerate(cameras):
            card = CameraCard(camera)
            card.clicked.connect(self._select_camera)
            card.full_requested.connect(self._open_full_view)
            self.cards[camera.camera_id] = card
            self.grid.addWidget(card, index // 2, index % 2)

        self._update_summary()

    def _filtered_cameras(self) -> list[CameraConfig]:
        query = self.search.text().strip().lower() if hasattr(self, "search") else ""
        status_filter = self.filter_box.currentText() if hasattr(self, "filter_box") else "Tất cả camera"

        cameras = self.cameras
        if query:
            cameras = [
                camera
                for camera in cameras
                if query in camera.name.lower()
                or query in camera.area.lower()
                or query in camera.group.lower()
                or query in camera.display_source().lower()
            ]

        if status_filter != "Tất cả camera":
            cameras = [camera for camera in cameras if camera.status == status_filter]

        return cameras

    def _update_summary(self) -> None:
        total = len(self.cameras)
        enabled = sum(1 for camera in self.cameras if camera.enabled)
        active = sum(1 for camera in self.cameras if camera.status == "Đang hoạt động")
        disconnected = sum(1 for camera in self.cameras if camera.status == "Mất kết nối")
        self.summary.setText(
            f"Tổng camera: {total}    Đang bật: {enabled}    Đang hoạt động: {active}    Mất kết nối: {disconnected}"
        )

    def _selected_camera(self) -> CameraConfig:
        return self._camera_by_id(self.selected_camera_id)

    def _camera_by_id(self, camera_id: str) -> CameraConfig:
        for camera in self.cameras:
            if camera.camera_id == camera_id:
                return camera
        return self.cameras[0]
