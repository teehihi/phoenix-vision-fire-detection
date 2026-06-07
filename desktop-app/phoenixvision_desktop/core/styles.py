from __future__ import annotations

from PySide6.QtGui import QColor
from PySide6.QtWidgets import QGraphicsDropShadowEffect, QWidget


APP_STYLESHEET = """
QWidget {
    font-family: Arial, Helvetica, sans-serif;
    color: #0F172A;
    font-size: 14px;
}
#content {
    background: #F6F8FB;
}
#sidebar {
    background: #FFFFFF;
    border-right: 1px solid #E5EDF7;
}
#panel, #cameraCard {
    background: #FFFFFF;
    border: 1px solid #DCE7F3;
    border-radius: 20px;
}
#cameraDialog {
    background: #F6F8FB;
}
#dialogPanel {
    background: #FFFFFF;
    border: 1px solid #DCE7F3;
    border-radius: 20px;
}
#formSection {
    background: #FFFFFF;
    border: 1px solid #E5EDF7;
    border-radius: 18px;
}
#formSectionTitle {
    color: #0F172A;
    font-size: 14px;
    font-weight: 900;
}
#cameraCard[selected="true"] {
    border: 2px solid #FF4B1F;
}
#cameraVideo {
    background: #0F172A;
    color: #E2E8F0;
    font-size: 15px;
    font-weight: 700;
    border-top-left-radius: 20px;
    border-top-right-radius: 20px;
}
#metricBar {
    background: #FFFFFF;
    border-bottom-left-radius: 20px;
    border-bottom-right-radius: 20px;
}
#metricCell {
    border-right: 1px solid #EEF3F9;
}
#metricName {
    color: #94A3B8;
    font-size: 12px;
    font-weight: 700;
}
#metricValue {
    color: #0F172A;
    font-size: 16px;
    font-weight: 800;
}
#statusChip, #riskChip, #riskPill {
    background: #ECFDF5;
    border: 1px solid #A7F3D0;
    border-radius: 16px;
    color: #047857;
    padding: 6px 12px;
    font-weight: 800;
}
#videoPill, #fpsPill {
    background: rgba(2, 6, 23, 0.76);
    border: 1px solid rgba(255, 255, 255, 0.14);
    border-radius: 14px;
    color: #ffffff;
    font-weight: 800;
    padding: 8px;
}
#fpsPill {
    min-width: 80px;
}
#ghostButton {
    background: rgba(15, 23, 42, 0.68);
    border: 1px solid rgba(255, 255, 255, 0.28);
    border-radius: 14px;
    color: #FFFFFF;
    padding: 8px 13px;
    font-weight: 800;
}
#ghostButton:hover {
    background: rgba(15, 23, 42, 0.86);
}
#iconButton {
    background: #F1F5F9;
    border: 1px solid #DCE7F3;
    border-radius: 14px;
    color: #334155;
    font-size: 20px;
    font-weight: 900;
}
#iconButton:hover {
    background: #FFF2EC;
    border: 1px solid #FFB59F;
    color: #D63E14;
}
#pageTitle, #panelTitle {
    color: #0F172A;
    font-size: 24px;
    font-weight: 900;
}
#caption, #captionOrange {
    color: #94A3B8;
    font-size: 12px;
    font-weight: 900;
    letter-spacing: 4px;
}
#captionOrange {
    color: #FF4B1F;
}
#mutedText {
    color: #64748B;
    font-size: 14px;
}
#sectionTitle {
    color: #0F172A;
    font-size: 16px;
    font-weight: 900;
}
#bigScore {
    color: #0F172A;
    font-size: 32px;
    font-weight: 900;
}
#softBox {
    background: #F8FAFC;
    border: 1px solid #DCE7F3;
    border-radius: 18px;
}
#riskBar {
    background: qlineargradient(x1:0, y1:0, x2:1, y2:0, stop:0 #22c55e, stop:0.5 #f59e0b, stop:1 #ef4444);
    border-radius: 4px;
}
#primaryButton {
    background: #FF4B1F;
    border: 0;
    border-radius: 16px;
    color: #FFFFFF;
    font-weight: 900;
    padding: 12px 20px;
}
#primaryButton:hover {
    background: #E53E14;
}
#primaryButton:pressed {
    background: #C93410;
}
#secondaryButton {
    background: #FFFFFF;
    border: 1px solid #DCE7F3;
    border-radius: 16px;
    color: #334155;
    font-weight: 800;
    padding: 12px 18px;
}
#secondaryButton:hover {
    background: #FFF7F3;
    border: 1px solid #FFB59F;
    color: #C93410;
}
SidebarButton, QPushButton {
    min-height: 42px;
}
SidebarButton {
    background: transparent;
    border: 0;
    border-radius: 16px;
    color: #475569;
    text-align: left;
    padding: 11px 16px;
    font-size: 15px;
    font-weight: 800;
}
SidebarButton:hover {
    background: #F8FAFC;
    color: #0F172A;
}
SidebarButton[active="true"] {
    background: #FFF2EC;
    color: #D63E14;
    border-left: 4px solid #FF4B1F;
}
#search, #combo, #inputSmall {
    background: #FFFFFF;
    border: 1px solid #DCE7F3;
    border-radius: 16px;
    padding: 10px 14px;
    color: #334155;
    selection-background-color: #FFDED4;
}
QLineEdit#search, QComboBox#combo, QSpinBox#inputSmall {
    min-height: 44px;
}
QLineEdit#search:focus, QComboBox#combo:focus, QSpinBox#inputSmall:focus {
    border: 1px solid #FF4B1F;
    background: #FFFFFF;
}
QComboBox::drop-down, QSpinBox::up-button, QSpinBox::down-button {
    border: 0;
    width: 24px;
    background: transparent;
}
QComboBox QAbstractItemView {
    background: #FFFFFF;
    border: 1px solid #DCE7F3;
    border-radius: 12px;
    padding: 6px;
    selection-background-color: #FFF2EC;
    selection-color: #D63E14;
}
QCheckBox {
    color: #334155;
    font-size: 14px;
    font-weight: 800;
}
QCheckBox::indicator {
    width: 18px;
    height: 18px;
    border-radius: 6px;
    border: 1px solid #DCE7F3;
    background: #FFFFFF;
}
QCheckBox::indicator:checked {
    background: #FF4B1F;
    border: 1px solid #FF4B1F;
}
QTableWidget#cameraTable {
    background: #FFFFFF;
    alternate-background-color: #F8FAFC;
    border: 1px solid #DCE7F3;
    border-radius: 16px;
    gridline-color: #EEF3F9;
    selection-background-color: #FFF2EC;
    selection-color: #C93410;
}
QTableWidget#cameraTable::item {
    padding: 12px 10px;
    border-bottom: 1px solid #EEF3F9;
}
QHeaderView::section {
    background: #F8FAFC;
    border: 0;
    border-bottom: 1px solid #DCE7F3;
    color: #475569;
    font-size: 13px;
    font-weight: 900;
    padding: 12px;
}
QDialog QLabel {
    color: #0F172A;
}
#scroll {
    border: 0;
    background: transparent;
}
#timeline {
    background: #FFFFFF;
    border: 1px solid #DCE7F3;
    border-radius: 14px;
    padding: 8px;
}
#summary {
    color: #64748B;
    font-size: 14px;
    padding-top: 4px;
}
#accountBox {
    background: #F8FAFC;
    border: 1px solid #DCE7F3;
    border-radius: 16px;
    padding: 14px;
    color: #475569;
    font-weight: 800;
}
"""


def apply_soft_shadow(widget: QWidget, blur_radius: int = 24, y_offset: int = 8, alpha: int = 28) -> None:
    shadow = QGraphicsDropShadowEffect(widget)
    shadow.setBlurRadius(blur_radius)
    shadow.setOffset(0, y_offset)
    shadow.setColor(QColor(30, 41, 59, alpha))
    widget.setGraphicsEffect(shadow)
