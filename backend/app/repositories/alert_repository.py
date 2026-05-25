from __future__ import annotations

from app.models.alert import Alert


class AlertRepository:
    def __init__(self) -> None:
        self._alerts: list[Alert] = []

    def list(self) -> list[Alert]:
        return sorted(self._alerts, key=lambda alert: alert.created_at, reverse=True)

    def add(self, alert: Alert) -> Alert:
        self._alerts.append(alert)
        return alert


alert_repository = AlertRepository()
