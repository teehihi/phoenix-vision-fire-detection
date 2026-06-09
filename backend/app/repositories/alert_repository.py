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

    def delete(self, alert_id: str) -> bool:
        initial_len = len(self._alerts)
        self._alerts = [alert for alert in self._alerts if alert.id != alert_id]
        return len(self._alerts) < initial_len

    def clear_all(self) -> None:
        self._alerts.clear()


alert_repository = AlertRepository()
