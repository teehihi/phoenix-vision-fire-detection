from __future__ import annotations

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

    def delete(self, user_id: str, alert_id: str) -> bool:
        reference = get_user_collection(user_id, self.collection_name).document(alert_id)
        if not reference.get().exists:
            return False
        reference.delete()
        return True

    def clear_all(self, user_id: str) -> None:
        delete_collection(get_user_collection(user_id, self.collection_name))


alert_repository = AlertRepository()
