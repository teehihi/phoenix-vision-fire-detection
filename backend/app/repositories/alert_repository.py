from __future__ import annotations

from datetime import datetime

from app.db.firestore import delete_collection, get_user_collection, with_expiration
from app.models.alert import Alert


class AlertRepository:
    collection_name = "alerts"

    def list(self, user_id: str) -> list[Alert]:
        alerts = [
            Alert.model_validate(document.to_dict())
            for document in get_user_collection(user_id, self.collection_name).stream()
        ]
        return sorted(alerts, key=lambda alert: alert.created_at, reverse=True)

    def add(self, user_id: str, alert: Alert) -> Alert:
        data = with_expiration(alert.model_dump(mode="python"))
        get_user_collection(user_id, self.collection_name).document(alert.id).set(data)
        return alert

    def save(self, user_id: str, alert: Alert) -> Alert:
        data = with_expiration(alert.model_dump(mode="python"))
        get_user_collection(user_id, self.collection_name).document(alert.id).set(data)
        return alert

    def find_recent_similar(
        self,
        user_id: str,
        camera_id: str,
        label: str,
        since: datetime,
    ) -> Alert | None:
        matches = [
            alert
            for alert in self.list(user_id)
            if alert.camera_id == camera_id and alert.label == label and alert.last_seen_at >= since
        ]
        if not matches:
            return None
        return max(matches, key=lambda alert: alert.last_seen_at)

    def delete(self, user_id: str, alert_id: str) -> bool:
        reference = get_user_collection(user_id, self.collection_name).document(alert_id)
        if not reference.get().exists:
            return False
        reference.delete()
        return True

    def delete_by_detection_ids(self, user_id: str, detection_ids: set[str]) -> None:
        if not detection_ids:
            return

        for document in get_user_collection(user_id, self.collection_name).stream():
            if document.to_dict().get("detection_id") in detection_ids:
                document.reference.delete()

    def clear_all(self, user_id: str) -> None:
        delete_collection(get_user_collection(user_id, self.collection_name))


alert_repository = AlertRepository()
