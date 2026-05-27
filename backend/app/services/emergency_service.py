from datetime import datetime, timedelta

from app.models.emergency import EmergencyEvent, EmergencyState, EmergencyStatus
from app.repositories.emergency_repository import EmergencyRepository
from app.repositories.incident_timeline_repository import incident_timeline_repository
from app.schemas.emergency import EmergencyEventCreate
from app.services.incident_timeline_service import IncidentTimelineService


class EmergencyService:
    def __init__(self, repository: EmergencyRepository) -> None:
        self.repository = repository
        self.timeline_service = IncidentTimelineService(incident_timeline_repository)
        self.cooldowns = {
            EmergencyState.monitoring: timedelta(seconds=0),
            EmergencyState.warning: timedelta(seconds=20),
            EmergencyState.emergency: timedelta(seconds=12),
            EmergencyState.critical: timedelta(seconds=6),
        }

    def list_events(self) -> list[EmergencyEvent]:
        return self.repository.list_events()

    def get_status(self, camera_id: str = "webcam-01") -> EmergencyStatus:
        return self.repository.get_status(camera_id)

    def ingest_event(self, payload: EmergencyEventCreate) -> EmergencyStatus:
        current = self.repository.get_status(payload.camera_id)
        next_state = self._state_for(payload.risk_score, payload.risk_level, payload.human_at_risk)
        now = datetime.utcnow()

        updated = current.model_copy(
            update={
                "risk_level": payload.risk_level.upper(),
                "risk_score": payload.risk_score,
                "human_at_risk": payload.human_at_risk,
                "snapshot_url": payload.snapshot_url or current.snapshot_url,
                "updated_at": now,
            }
        )

        if not self._should_transition(current, next_state, now):
            return self.repository.save_status(updated)

        event = EmergencyEvent(
            camera_id=payload.camera_id,
            state=next_state,
            previous_state=current.state,
            risk_level=payload.risk_level.upper(),
            risk_score=payload.risk_score,
            human_at_risk=payload.human_at_risk,
            message=payload.message or self._message_for(next_state, payload),
            snapshot_url=payload.snapshot_url,
            escalation_count=current.escalation_count + 1 if self._is_escalation(current.state, next_state) else current.escalation_count,
            created_at=now,
        )
        self.repository.add_event(event)
        self.timeline_service.create_from_emergency(event)

        updated = updated.model_copy(
            update={
                "state": next_state,
                "active_event_id": event.id if next_state != EmergencyState.monitoring else None,
                "escalation_count": event.escalation_count,
                "last_transition_at": now,
            }
        )
        return self.repository.save_status(updated)

    def acknowledge(self, event_id: str) -> EmergencyEvent | None:
        event = self.repository.find_event(event_id)
        if event is None:
            return None
        event.acknowledged_at = datetime.utcnow()
        return event

    def resolve(self, event_id: str) -> EmergencyEvent | None:
        event = self.repository.find_event(event_id)
        if event is None:
            return None

        event.resolved_at = datetime.utcnow()
        status = self.repository.get_status(event.camera_id)
        self.repository.save_status(
            status.model_copy(
                update={
                    "state": EmergencyState.monitoring,
                    "active_event_id": None,
                    "risk_level": "LOW",
                    "risk_score": 0.0,
                    "human_at_risk": False,
                    "last_transition_at": event.resolved_at,
                    "updated_at": event.resolved_at,
                }
            )
        )
        return event

    @staticmethod
    def _state_for(risk_score: float, risk_level: str, human_at_risk: bool) -> EmergencyState:
        normalized_level = risk_level.upper()
        if normalized_level == "CRITICAL" or risk_score >= 81:
            return EmergencyState.critical
        if human_at_risk or normalized_level == "HIGH" or risk_score >= 61:
            return EmergencyState.emergency
        if normalized_level == "MEDIUM" or risk_score >= 31:
            return EmergencyState.warning
        return EmergencyState.monitoring

    def _should_transition(self, current: EmergencyStatus, next_state: EmergencyState, now: datetime) -> bool:
        if next_state != current.state:
            return True

        cooldown = self.cooldowns[next_state]
        return now - current.last_transition_at >= cooldown

    @staticmethod
    def _is_escalation(previous: EmergencyState, current: EmergencyState) -> bool:
        priority = {
            EmergencyState.monitoring: 0,
            EmergencyState.warning: 1,
            EmergencyState.emergency: 2,
            EmergencyState.critical: 3,
        }
        return priority[current] > priority[previous]

    @staticmethod
    def _message_for(state: EmergencyState, payload: EmergencyEventCreate) -> str:
        if state == EmergencyState.critical:
            return "Critical fire danger. Evacuate and notify emergency contacts immediately."
        if state == EmergencyState.emergency:
            return "Human at risk near fire or smoke zone."
        if state == EmergencyState.warning:
            return "Fire or smoke risk detected. Continue monitoring."
        return "Monitoring normal."
