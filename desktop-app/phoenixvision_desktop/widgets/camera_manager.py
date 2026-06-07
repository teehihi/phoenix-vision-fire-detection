from __future__ import annotations

from PySide6.QtCore import Qt
from PySide6.QtWidgets import (
    QCheckBox,
    QComboBox,
    QDialog,
    QFormLayout,
    QFrame,
    QGridLayout,
    QHBoxLayout,
    QHeaderView,
    QLabel,
    QLineEdit,
    QMessageBox,
    QPushButton,
    QSpinBox,
    QTableWidget,
    QTableWidgetItem,
    QVBoxLayout,
    QWidget,
)

from phoenixvision_desktop.core.camera_registry import CameraConnectionTester, new_camera_id
from phoenixvision_desktop.core.models import CameraConfig
from phoenixvision_desktop.core.styles import apply_soft_shadow


SOURCE_TYPES = ["WEBCAM", "HIKVISION", "RTSP", "MJPEG", "HTTP"]


class CameraEditorDialog(QDialog):
    def __init__(self, camera: CameraConfig | None = None, parent: QWidget | None = None) -> None:
        super().__init__(parent)
        self.camera = camera
        self.setObjectName("cameraDialog")
        self.setWindowTitle("Thêm camera" if camera is None else "Sửa camera")
        self.setModal(True)
        self.resize(820, 560)
        self.setMinimumWidth(760)
        self._build_ui()
        self._load(camera)

    def _build_ui(self) -> None:
        layout = QVBoxLayout(self)
        layout.setContentsMargins(22, 22, 22, 22)
        layout.setSpacing(18)

        panel = QFrame()
        panel.setObjectName("dialogPanel")
        apply_soft_shadow(panel, blur_radius=28, y_offset=10, alpha=30)
        panel_layout = QVBoxLayout(panel)
        panel_layout.setContentsMargins(24, 24, 24, 24)
        panel_layout.setSpacing(18)
        layout.addWidget(panel)

        title_row = QHBoxLayout()
        title_box = QVBoxLayout()
        caption = QLabel("CAMERA SOURCE")
        caption.setObjectName("captionOrange")
        title = QLabel("Cấu hình nguồn camera")
        title.setObjectName("panelTitle")
        title_box.addWidget(caption)
        title_box.addWidget(title)
        title_row.addLayout(title_box)
        title_row.addStretch()
        panel_layout.addLayout(title_row)

        hint = QLabel(
            "Hikvision thường dùng RTSP: rtsp://user:pass@IP:554/Streaming/Channels/101. "
            "Nếu dùng NVR nhiều kênh, đổi channel thành 201, 301..."
        )
        hint.setObjectName("mutedText")
        hint.setWordWrap(True)
        panel_layout.addWidget(hint)

        self.name = QLineEdit()
        self.area = QLineEdit()
        self.group = QLineEdit()
        self.source_type = QComboBox()
        self.source_type.addItems(SOURCE_TYPES)
        self.source_value = QLineEdit()
        self.host = QLineEdit()
        self.port = QSpinBox()
        self.port.setRange(1, 65535)
        self.port.setValue(554)
        self.channel = QLineEdit()
        self.username = QLineEdit()
        self.password = QLineEdit()
        self.password.setEchoMode(QLineEdit.Password)
        self.stream_path = QLineEdit()
        self.enabled = QCheckBox("Bật camera này")
        self.enabled.setChecked(True)
        self._style_fields()

        section_grid = QGridLayout()
        section_grid.setHorizontalSpacing(16)
        section_grid.setVerticalSpacing(16)
        panel_layout.addLayout(section_grid)

        info_section, info_form = self._section("Thông tin camera")
        info_form.addRow("Tên camera", self.name)
        info_form.addRow("Khu vực", self.area)
        info_form.addRow("Nhóm", self.group)
        info_form.addRow("", self.enabled)

        source_section, source_form = self._section("Nguồn phát")
        source_form.addRow("Loại nguồn", self.source_type)
        source_form.addRow("URL / webcam index", self.source_value)
        source_form.addRow("IP / Host", self.host)
        source_form.addRow("Port", self.port)
        source_form.addRow("Channel / stream", self.channel)

        auth_section, auth_form = self._section("Xác thực & nâng cao")
        auth_form.addRow("Username", self.username)
        auth_form.addRow("Password", self.password)
        auth_form.addRow("Custom path", self.stream_path)

        section_grid.addWidget(info_section, 0, 0)
        section_grid.addWidget(source_section, 0, 1)
        section_grid.addWidget(auth_section, 1, 0, 1, 2)
        section_grid.setColumnStretch(0, 1)
        section_grid.setColumnStretch(1, 1)

        self.source_type.currentTextChanged.connect(self._apply_type_defaults)

        actions = QHBoxLayout()
        actions.addStretch()
        cancel = QPushButton("Hủy")
        cancel.setObjectName("secondaryButton")
        save = QPushButton("Lưu")
        save.setObjectName("primaryButton")
        cancel.setCursor(Qt.PointingHandCursor)
        save.setCursor(Qt.PointingHandCursor)
        cancel.clicked.connect(self.reject)
        save.clicked.connect(self.accept)
        actions.addWidget(cancel)
        actions.addWidget(save)
        panel_layout.addLayout(actions)

    def _style_fields(self) -> None:
        for field in [
            self.name,
            self.area,
            self.group,
            self.source_value,
            self.host,
            self.channel,
            self.username,
            self.password,
            self.stream_path,
        ]:
            field.setObjectName("search")
            field.setMinimumHeight(46)
        self.source_type.setObjectName("combo")
        self.port.setObjectName("inputSmall")

    @staticmethod
    def _section(title: str) -> tuple[QFrame, QFormLayout]:
        section = QFrame()
        section.setObjectName("formSection")
        layout = QVBoxLayout(section)
        layout.setContentsMargins(18, 18, 18, 18)
        layout.setSpacing(12)

        heading = QLabel(title)
        heading.setObjectName("formSectionTitle")
        layout.addWidget(heading)

        form = QFormLayout()
        form.setLabelAlignment(Qt.AlignLeft)
        form.setFormAlignment(Qt.AlignTop)
        form.setHorizontalSpacing(14)
        form.setVerticalSpacing(10)
        layout.addLayout(form)
        return section, form

    def _load(self, camera: CameraConfig | None) -> None:
        if camera is None:
            self.name.setText("Camera mới")
            self.area.setText("Chưa phân khu")
            self.group.setText("Default")
            self.source_type.setCurrentText("HIKVISION")
            self.channel.setText("101")
            self._apply_type_defaults("HIKVISION")
            return

        self.name.setText(camera.name)
        self.area.setText(camera.area)
        self.group.setText(camera.group)
        self.source_type.setCurrentText(camera.source_type)
        self.source_value.setText(camera.source_value)
        self.host.setText(camera.host)
        self.port.setValue(camera.port)
        self.channel.setText(camera.channel)
        self.username.setText(camera.username)
        self.password.setText(camera.password)
        self.stream_path.setText(camera.stream_path)
        self.enabled.setChecked(camera.enabled)

    def _apply_type_defaults(self, source_type: str) -> None:
        if source_type == "WEBCAM":
            self.source_value.setPlaceholderText("0")
            self.host.setPlaceholderText("Để trống")
            self.channel.setPlaceholderText("Để trống")
            self.port.setValue(554)
        elif source_type == "HIKVISION":
            self.source_value.setPlaceholderText("192.168.1.x hoặc domain DDNS")
            self.host.setPlaceholderText("192.168.1.x")
            self.channel.setPlaceholderText("101 main, 102 sub, 201 kênh 2...")
            self.stream_path.setPlaceholderText("/Streaming/Channels/101")
            self.port.setValue(554)
        elif source_type == "RTSP":
            self.source_value.setPlaceholderText("rtsp://user:pass@host:554/stream")
            self.port.setValue(554)
        elif source_type == "MJPEG":
            self.source_value.setPlaceholderText("http://host:port/video.mjpg")
            self.port.setValue(80)
        else:
            self.source_value.setPlaceholderText("http://host:port/path")
            self.port.setValue(80)

    def selected_camera(self) -> CameraConfig:
        source_type = self.source_type.currentText()
        camera_id = self.camera.camera_id if self.camera else new_camera_id(source_type.lower())
        source_value = self.source_value.text().strip()
        host = self.host.text().strip()
        if source_type == "HIKVISION" and not source_value:
            source_value = host
        if source_type == "WEBCAM" and not source_value:
            source_value = "0"

        return CameraConfig(
            camera_id=camera_id,
            name=self.name.text().strip() or "Camera",
            area=self.area.text().strip() or "Chưa phân khu",
            source_type=source_type,
            status="Sẵn sàng" if self.enabled.isChecked() else "Đang tắt",
            risk_level="LOW",
            risk_score=0,
            fps=0.0,
            is_local=source_type == "WEBCAM",
            source_value=source_value,
            enabled=self.enabled.isChecked(),
            group=self.group.text().strip() or "Default",
            username=self.username.text().strip(),
            password=self.password.text(),
            host=host or source_value,
            port=self.port.value(),
            channel=self.channel.text().strip() or "101",
            stream_path=self.stream_path.text().strip(),
        )


class CameraManagerDialog(QDialog):
    def __init__(self, cameras: list[CameraConfig], parent: QWidget | None = None) -> None:
        super().__init__(parent)
        self.setObjectName("cameraDialog")
        self.setModal(True)
        self.cameras = list(cameras)
        self.tester = CameraConnectionTester()
        self.setWindowTitle("Quản lý camera")
        self.resize(1080, 640)
        self._build_ui()
        self._refresh_table()

    def _build_ui(self) -> None:
        layout = QVBoxLayout(self)
        layout.setContentsMargins(22, 22, 22, 22)
        layout.setSpacing(18)

        panel = QFrame()
        panel.setObjectName("dialogPanel")
        apply_soft_shadow(panel, blur_radius=28, y_offset=10, alpha=30)
        panel_layout = QVBoxLayout(panel)
        panel_layout.setContentsMargins(24, 24, 24, 24)
        panel_layout.setSpacing(18)
        layout.addWidget(panel)

        head = QHBoxLayout()
        title_box = QVBoxLayout()
        caption = QLabel("CAMERA REGISTRY")
        caption.setObjectName("captionOrange")
        title = QLabel("Quản lý danh sách camera")
        title.setObjectName("panelTitle")
        title_box.addWidget(caption)
        title_box.addWidget(title)
        head.addLayout(title_box)
        head.addStretch()
        panel_layout.addLayout(head)

        self.table = QTableWidget(0, 8)
        self.table.setObjectName("cameraTable")
        self.table.setHorizontalHeaderLabels(["Tên", "Khu vực", "Nhóm", "Loại", "Nguồn", "Trạng thái", "Bật", "Risk"])
        self.table.setAlternatingRowColors(True)
        self.table.verticalHeader().setVisible(False)
        self.table.verticalHeader().setDefaultSectionSize(46)
        self.table.horizontalHeader().setSectionResizeMode(0, QHeaderView.Stretch)
        self.table.horizontalHeader().setSectionResizeMode(4, QHeaderView.Stretch)
        self.table.horizontalHeader().setMinimumSectionSize(110)
        self.table.setSelectionBehavior(QTableWidget.SelectRows)
        self.table.setSelectionMode(QTableWidget.SingleSelection)
        panel_layout.addWidget(self.table, 1)

        actions = QHBoxLayout()
        add_button = QPushButton("Thêm")
        edit_button = QPushButton("Sửa")
        delete_button = QPushButton("Xóa")
        test_button = QPushButton("Test connection")
        add_button.setObjectName("primaryButton")
        edit_button.setObjectName("secondaryButton")
        delete_button.setObjectName("secondaryButton")
        test_button.setObjectName("secondaryButton")
        for button in [add_button, edit_button, delete_button, test_button]:
            button.setCursor(Qt.PointingHandCursor)
        add_button.clicked.connect(self._add_camera)
        edit_button.clicked.connect(self._edit_camera)
        delete_button.clicked.connect(self._delete_camera)
        test_button.clicked.connect(self._test_camera)
        actions.addWidget(add_button)
        actions.addWidget(edit_button)
        actions.addWidget(delete_button)
        actions.addWidget(test_button)
        actions.addStretch()
        panel_layout.addLayout(actions)

        footer = QHBoxLayout()
        footer.addStretch()
        cancel = QPushButton("Hủy")
        cancel.setObjectName("secondaryButton")
        save = QPushButton("Lưu")
        save.setObjectName("primaryButton")
        cancel.setCursor(Qt.PointingHandCursor)
        save.setCursor(Qt.PointingHandCursor)
        cancel.clicked.connect(self.reject)
        save.clicked.connect(self.accept)
        footer.addWidget(cancel)
        footer.addWidget(save)
        panel_layout.addLayout(footer)

    def _refresh_table(self) -> None:
        self.table.setRowCount(len(self.cameras))
        for row, camera in enumerate(self.cameras):
            values = [
                camera.name,
                camera.area,
                camera.group,
                camera.source_type,
                camera.display_source(),
                camera.status,
                "Có" if camera.enabled else "Không",
                f"{camera.risk_level} {camera.risk_score}",
            ]
            for column, value in enumerate(values):
                item = QTableWidgetItem(value)
                item.setFlags(item.flags() & ~Qt.ItemIsEditable)
                self.table.setItem(row, column, item)

    def _selected_row(self) -> int:
        indexes = self.table.selectionModel().selectedRows()
        return indexes[0].row() if indexes else -1

    def _add_camera(self) -> None:
        dialog = CameraEditorDialog(parent=self)
        if dialog.exec() == QDialog.Accepted:
            self.cameras.append(dialog.selected_camera())
            self._refresh_table()

    def _edit_camera(self) -> None:
        row = self._selected_row()
        if row < 0:
            QMessageBox.information(self, "Chọn camera", "Hãy chọn camera cần sửa.")
            return

        dialog = CameraEditorDialog(self.cameras[row], self)
        if dialog.exec() == QDialog.Accepted:
            self.cameras[row] = dialog.selected_camera()
            self._refresh_table()
            self.table.selectRow(row)

    def _delete_camera(self) -> None:
        row = self._selected_row()
        if row < 0:
            QMessageBox.information(self, "Chọn camera", "Hãy chọn camera cần xóa.")
            return

        camera = self.cameras[row]
        if camera.camera_id == "local":
            QMessageBox.warning(self, "Không xóa local", "Webcam local được giữ làm fallback.")
            return

        if QMessageBox.question(self, "Xóa camera", f"Xóa {camera.name}?") == QMessageBox.Yes:
            self.cameras.pop(row)
            self._refresh_table()

    def _test_camera(self) -> None:
        row = self._selected_row()
        if row < 0:
            QMessageBox.information(self, "Chọn camera", "Hãy chọn camera cần test.")
            return

        camera = self.cameras[row]
        ok, message = self.tester.test(camera)
        if ok:
            self.cameras[row] = CameraConfig(**{**camera.__dict__, "status": "Đang hoạt động"})
            QMessageBox.information(self, "Kết nối OK", message)
        else:
            self.cameras[row] = CameraConfig(**{**camera.__dict__, "status": "Mất kết nối"})
            QMessageBox.warning(self, "Kết nối lỗi", message)
        self._refresh_table()
        self.table.selectRow(row)
