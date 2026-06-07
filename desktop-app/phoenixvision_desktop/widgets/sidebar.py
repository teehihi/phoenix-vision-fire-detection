from __future__ import annotations

from PySide6.QtCore import Qt
from PySide6.QtGui import QPixmap
from PySide6.QtWidgets import QFrame, QLabel, QPushButton, QVBoxLayout, QWidget

from phoenixvision_desktop.core.paths import LOGO_LANDSCAPE


class SidebarButton(QPushButton):
    def __init__(self, label: str, active: bool = False) -> None:
        super().__init__(label)
        self.setCursor(Qt.PointingHandCursor)
        self.setProperty("active", active)


class Sidebar(QFrame):
    def __init__(self) -> None:
        super().__init__()
        self.setObjectName("sidebar")
        self.setFixedWidth(260)

        layout = QVBoxLayout(self)
        layout.setContentsMargins(24, 30, 24, 24)
        layout.setSpacing(24)
        layout.addWidget(self._logo())
        layout.addLayout(self._nav())
        layout.addStretch()

        account = QLabel("Local desktop mode")
        account.setObjectName("accountBox")
        layout.addWidget(account)

    def _logo(self) -> QWidget:
        logo = QLabel()
        logo.setAlignment(Qt.AlignCenter)
        if LOGO_LANDSCAPE.exists():
            logo.setPixmap(QPixmap(str(LOGO_LANDSCAPE)).scaledToWidth(190, Qt.SmoothTransformation))
        else:
            logo.setText("PhoenixVision")
        return logo

    @staticmethod
    def _nav() -> QVBoxLayout:
        nav = QVBoxLayout()
        nav.setSpacing(10)
        nav.addWidget(SidebarButton("Dashboard"))
        nav.addWidget(SidebarButton("Giám sát trực tiếp", active=True))
        nav.addWidget(SidebarButton("Lịch sử sự cố"))
        nav.addWidget(SidebarButton("Cảnh báo"))
        return nav
