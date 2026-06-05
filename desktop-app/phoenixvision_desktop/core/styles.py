APP_STYLESHEET = """
QWidget {
    font-family: Arial, Helvetica, sans-serif;
    color: #0f172a;
}
#content {
    background: #f6f8fc;
}
#sidebar {
    background: #ffffff;
    border-right: 1px solid #e2e8f0;
}
#panel, #cameraCard {
    background: #ffffff;
    border: 1px solid #dbe4ef;
    border-radius: 22px;
}
#cameraCard[selected="true"] {
    border: 2px solid #fb923c;
}
#cameraVideo {
    background: #0f172a;
    color: #e2e8f0;
    font-size: 17px;
    font-weight: 700;
    border-top-left-radius: 22px;
    border-top-right-radius: 22px;
}
#metricBar {
    background: #ffffff;
    border-bottom-left-radius: 22px;
    border-bottom-right-radius: 22px;
}
#metricCell {
    border-right: 1px solid #edf2f7;
}
#metricName {
    color: #94a3b8;
    font-size: 12px;
    font-weight: 700;
}
#metricValue {
    color: #020617;
    font-size: 17px;
    font-weight: 800;
}
#statusChip, #riskChip, #riskPill {
    background: #ecfdf5;
    border: 1px solid #86efac;
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
#ghostButton, #iconButton {
    background: rgba(15, 23, 42, 0.72);
    border: 1px solid rgba(255, 255, 255, 0.22);
    border-radius: 16px;
    color: #ffffff;
    padding: 8px 12px;
    font-weight: 800;
}
#pageTitle, #panelTitle {
    color: #020617;
    font-size: 25px;
    font-weight: 900;
}
#caption, #captionOrange {
    color: #94a3b8;
    font-size: 12px;
    font-weight: 900;
    letter-spacing: 4px;
}
#captionOrange {
    color: #ea580c;
}
#mutedText {
    color: #64748b;
    font-size: 14px;
}
#sectionTitle {
    color: #0f172a;
    font-size: 17px;
    font-weight: 900;
}
#bigScore {
    color: #020617;
    font-size: 34px;
    font-weight: 900;
}
#softBox {
    background: #f8fafc;
    border: 1px solid #dbe4ef;
    border-radius: 18px;
}
#riskBar {
    background: qlineargradient(x1:0, y1:0, x2:1, y2:0, stop:0 #22c55e, stop:0.5 #f59e0b, stop:1 #ef4444);
    border-radius: 4px;
}
#primaryButton {
    background: #ea580c;
    border: 0;
    border-radius: 14px;
    color: #ffffff;
    font-weight: 900;
    padding: 11px 18px;
}
#secondaryButton {
    background: #ffffff;
    border: 1px solid #dbe4ef;
    border-radius: 14px;
    color: #334155;
    font-weight: 800;
    padding: 11px 18px;
}
SidebarButton, QPushButton {
    min-height: 38px;
}
SidebarButton {
    background: transparent;
    border: 0;
    border-radius: 12px;
    color: #475569;
    text-align: left;
    padding: 10px 14px;
    font-size: 15px;
    font-weight: 800;
}
SidebarButton[active="true"] {
    background: #fff7ed;
    color: #c2410c;
}
#search, #combo, #inputSmall {
    background: #ffffff;
    border: 1px solid #dbe4ef;
    border-radius: 14px;
    padding: 10px 12px;
    color: #334155;
}
#scroll {
    border: 0;
    background: transparent;
}
#timeline {
    background: #ffffff;
    border: 1px solid #e2e8f0;
    border-radius: 14px;
    padding: 8px;
}
#summary {
    color: #64748b;
    font-size: 14px;
    padding-top: 4px;
}
#accountBox {
    background: #f8fafc;
    border: 1px solid #e2e8f0;
    border-radius: 14px;
    padding: 14px;
    color: #475569;
    font-weight: 800;
}
"""
