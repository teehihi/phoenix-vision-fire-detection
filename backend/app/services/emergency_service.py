from datetime import datetime
import asyncio
import logging

from app.db.storage import store_snapshot
from app.models.emergency import EmergencyEvent, EmergencyState, EmergencyStatus
from app.repositories.emergency_repository import EmergencyRepository
from app.repositories.incident_timeline_repository import incident_timeline_repository
from app.schemas.emergency import EmergencyEventCreate
from app.services.incident_timeline_service import IncidentTimelineService
from app.services.esp32_client import esp32_client
from app.core.config import settings

logger = logging.getLogger(__name__)


class EmergencyService:
    def __init__(self, repository: EmergencyRepository) -> None:
        self.repository = repository
        self.timeline_service = IncidentTimelineService(incident_timeline_repository)

    def list_events(self, user_id: str) -> list[EmergencyEvent]:
        return self.repository.list_events(user_id)

    def get_status(self, user_id: str, camera_id: str = "webcam-0") -> EmergencyStatus:
        return self.repository.get_status(user_id, camera_id)

    def ingest_event(self, user_id: str, payload: EmergencyEventCreate) -> EmergencyStatus:
        current = self.repository.get_status(user_id, payload.camera_id)
        next_state = self._state_for(payload.risk_score, payload.risk_level, payload.human_at_risk)
        now = datetime.utcnow()

        priority = {
            EmergencyState.monitoring: 0,
            EmergencyState.warning: 1,
            EmergencyState.emergency: 2,
            EmergencyState.critical: 3,
        }

        # Auto-Resolve: If frontend sends LOW, force state to monitoring and bypass downgrade block
        if payload.risk_level.upper() == "LOW":
            next_state = EmergencyState.monitoring
        else:
            # Do not allow automatic downgrade/de-escalation during an active emergency event.
            # Downward transitions must be performed by operator actions (Resolve) OR Auto-Resolve.
            if current.state != EmergencyState.monitoring and priority[next_state] < priority[current.state]:
                updated = current.model_copy(
                    update={
                        "risk_score": max(current.risk_score, payload.risk_score),
                        "snapshot_url": payload.snapshot_url or current.snapshot_url,
                        "updated_at": now,
                    }
                )
                return self.repository.save_status(user_id, updated)

        updated = current.model_copy(
            update={
                "risk_level": payload.risk_level.upper(),
                "risk_score": payload.risk_score,
                "confidence": payload.confidence,
                "human_at_risk": payload.human_at_risk,
                "updated_at": now,
            }
        )

        if next_state == current.state:
            result = self.repository.save_status(user_id, updated)
            # Re-trigger IoT to ensure it's active if it was manually stopped
            try:
                loop = asyncio.get_event_loop()
                if next_state == EmergencyState.critical:
                    if loop.is_running():
                        loop.create_task(esp32_client.trigger_alarm("critical"))
                        loop.create_task(esp32_client.trigger_pump(True))
                    else:
                        loop.run_until_complete(esp32_client.trigger_alarm("critical"))
                        loop.run_until_complete(esp32_client.trigger_pump(True))
                elif next_state in [EmergencyState.warning, EmergencyState.emergency]:
                    level = "high" if next_state == EmergencyState.emergency else "medium"
                    if loop.is_running():
                        loop.create_task(esp32_client.trigger_alarm(level))
                    else:
                        loop.run_until_complete(esp32_client.trigger_alarm(level))
            except Exception as e:
                logger.error(f"Failed to re-trigger ESP32 on same state update: {e}")
            return result

        event = EmergencyEvent(
            camera_id=payload.camera_id,
            state=next_state,
            previous_state=current.state,
            risk_level=payload.risk_level.upper(),
            risk_score=payload.risk_score,
            confidence=payload.confidence,
            human_at_risk=payload.human_at_risk,
            message=payload.message or self._message_for(next_state, payload),
            escalation_count=current.escalation_count + 1 if self._is_escalation(current.state, next_state) else current.escalation_count,
            created_at=now,
        )
        incident_id = current.active_event_id or event.id
        should_store_snapshot = next_state != current.state or not current.snapshot_url
        event.snapshot_url = (
            store_snapshot(user_id, event.id, payload.snapshot_url)
            if should_store_snapshot
            else current.snapshot_url
        )
        self.repository.add_event(user_id, event)
        self.timeline_service.create_from_emergency(user_id, event, incident_id)

        if next_state != EmergencyState.monitoring:
            from app.models.alert import Alert
            from app.models.detection import DetectionSeverity
            from app.repositories.alert_repository import alert_repository

            severity = DetectionSeverity.low
            if payload.risk_level.upper() == "CRITICAL":
                severity = DetectionSeverity.critical
            elif payload.risk_level.upper() == "HIGH":
                severity = DetectionSeverity.high
            elif payload.risk_level.upper() == "MEDIUM":
                severity = DetectionSeverity.medium

            alert_repository.add(
                user_id,
                Alert(
                    detection_id=event.id,
                    camera_id=event.camera_id,
                    label="emergency",
                    incident_id=incident_id,
                    title=f"Cảnh báo nguy cơ: {payload.risk_level.upper()}",
                    message=event.message,
                    severity=severity,
                    snapshot_url=event.snapshot_url,
                )
            )

        updated = updated.model_copy(
            update={
                "state": next_state,
                "active_event_id": incident_id if next_state != EmergencyState.monitoring else None,
                "snapshot_url": event.snapshot_url or current.snapshot_url,
                "escalation_count": event.escalation_count,
                "last_transition_at": now,
            }
        )

        # Trigger ESP32 alarm/pump based on state transitions
        if next_state != current.state:
            try:
                loop = asyncio.get_event_loop()
                if next_state == EmergencyState.critical:
                    # Critical: Alarm ON (critical) + Pump ON immediately
                    if loop.is_running():
                        loop.create_task(esp32_client.trigger_alarm("critical"))
                        loop.create_task(esp32_client.trigger_pump(True))
                    else:
                        loop.run_until_complete(esp32_client.trigger_alarm("critical"))
                        loop.run_until_complete(esp32_client.trigger_pump(True))
                elif next_state in [EmergencyState.warning, EmergencyState.emergency]:
                    # Warning/Emergency: Alarm ON immediately, pump follows the 10s delay.
                    level = "high" if next_state == EmergencyState.emergency else "medium"
                    if loop.is_running():
                        loop.create_task(esp32_client.trigger_alarm(level))
                        if current.state == EmergencyState.monitoring:
                            loop.create_task(esp32_client.trigger_pump(False, force=True))
                    else:
                        loop.run_until_complete(esp32_client.trigger_alarm(level))
                        if current.state == EmergencyState.monitoring:
                            loop.run_until_complete(esp32_client.trigger_pump(False, force=True))
                    
                    # Schedule automatic pump trigger after delay
                    delay = settings.esp32_auto_pump_delay_seconds
                    if loop.is_running():
                        loop.create_task(self._schedule_auto_pump(user_id, incident_id, event.camera_id, delay))
                elif next_state == EmergencyState.monitoring:
                    # Reset: Alarm OFF + Pump OFF
                    if loop.is_running():
                        loop.create_task(esp32_client.stop_alarm())
                        loop.create_task(esp32_client.trigger_pump(False, force=True))
                    else:
                        loop.run_until_complete(esp32_client.stop_alarm())
                        loop.run_until_complete(esp32_client.trigger_pump(False, force=True))
            except Exception as e:
                logger.error(f"Failed to control ESP32 on state change: {e}")

        return self.repository.save_status(user_id, updated)


    def acknowledge(self, user_id: str, event_id: str) -> EmergencyEvent | None:
        event = self.repository.find_event(user_id, event_id)
        if event is None:
            return None
        event.acknowledged_at = datetime.utcnow()
        self.repository.save_event(user_id, event)
        status = self.repository.get_status(user_id, event.camera_id)
        incident_id = status.active_event_id or event.id

        # Log operator action to timeline
        from app.models.incident_timeline import IncidentEventType, IncidentRiskLevel
        from app.schemas.incident_timeline import IncidentTimelineEventCreate

        self.timeline_service.create_event(
            user_id,
            IncidentTimelineEventCreate(
                camera_id=event.camera_id,
                event_type=IncidentEventType.operator_action,
                title="Xác nhận sự cố (Acknowledge)",
                description=f"Người vận hành đã xác nhận sự cố khẩn cấp. (Mô tả: {event.message})",
                risk_level=IncidentRiskLevel(event.risk_level.upper()),
                risk_score=event.risk_score,
                confidence=event.confidence,
                human_at_risk=event.human_at_risk,
                humans_nearby_count=1 if event.human_at_risk else 0,
                snapshot_url=event.snapshot_url,
            metadata={
                "emergencyEventId": event.id,
                "incidentId": incident_id,
                "action": "acknowledge",
                "operator": "system_operator"
            }
            )
        )
        return event

    def resolve(self, user_id: str, event_id: str) -> EmergencyEvent | None:
        event = self.repository.find_event(user_id, event_id)
        if event is None:
            return None

        event.resolved_at = datetime.utcnow()
        self.repository.save_event(user_id, event)
        status = self.repository.get_status(user_id, event.camera_id)
        incident_id = status.active_event_id or event.id
        self.repository.save_status(
            user_id,
            status.model_copy(
                update={
                    "state": EmergencyState.monitoring,
                    "active_event_id": None,
                    "risk_level": "LOW",
                    "risk_score": 0.0,
                    "human_at_risk": False,
                    "snapshot_url": None,
                    "last_transition_at": event.resolved_at,
                    "updated_at": event.resolved_at,
                }
            )
        )

        # Log operator action to timeline
        from app.models.incident_timeline import IncidentEventType, IncidentRiskLevel
        from app.schemas.incident_timeline import IncidentTimelineEventCreate

        self.timeline_service.create_event(
            user_id,
            IncidentTimelineEventCreate(
                camera_id=event.camera_id,
                event_type=IncidentEventType.operator_action,
                title="Khắc phục sự cố (Resolve)",
                description="Người vận hành đã giải quyết/khắc phục sự cố khẩn cấp. Hệ thống trở lại trạng thái giám sát bình thường.",
                risk_level=IncidentRiskLevel.low,
                risk_score=0.0,
                human_at_risk=False,
                humans_nearby_count=0,
                snapshot_url=event.snapshot_url,
            metadata={
                "emergencyEventId": event.id,
                "incidentId": incident_id,
                "action": "resolve",
                "operator": "system_operator"
            }
            )
        )
        # Turn off ESP32 alarm/pump on resolve
        try:
            loop = asyncio.get_event_loop()
            if loop.is_running():
                loop.create_task(esp32_client.stop_alarm())
                loop.create_task(esp32_client.trigger_pump(False, force=True))
            else:
                loop.run_until_complete(esp32_client.stop_alarm())
                loop.run_until_complete(esp32_client.trigger_pump(False, force=True))
        except Exception as e:
            logger.error(f"Failed to stop ESP32 alarm on resolve: {e}")

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

    async def _schedule_auto_pump(self, user_id: str, incident_id: str, camera_id: str, delay_seconds: int):
        logger.info(f"Scheduled auto-pump check for incident {incident_id} in {delay_seconds} seconds")
        await asyncio.sleep(delay_seconds)

        event = self.repository.find_event(user_id, incident_id)
        if not event or event.resolved_at is not None:
            return

        status = self.repository.get_status(user_id, camera_id)
        if status.active_event_id == incident_id and status.state in [EmergencyState.warning, EmergencyState.emergency]:
            if esp32_client.pump_on:
                logger.info(f"Auto-pump skipped for incident {incident_id} because pump is already active.")
                return

            logger.warning(f"Incident {incident_id} is still active after {delay_seconds} seconds. Automatically activating pump!")
            try:
                await esp32_client.trigger_pump(True)

                # Log this automatic action in the timeline.
                from app.models.incident_timeline import IncidentEventType, IncidentRiskLevel
                from app.schemas.incident_timeline import IncidentTimelineEventCreate

                self.timeline_service.create_event(
                    user_id,
                    IncidentTimelineEventCreate(
                        camera_id=event.camera_id,
                        event_type=IncidentEventType.operator_action,
                        title="Tự động kích hoạt bơm",
                        description=f"Hệ thống tự động bật bơm nước dập lửa sau {delay_seconds} giây sự cố vẫn còn hoạt động.",
                        risk_level=IncidentRiskLevel(event.risk_level.upper()),
                        risk_score=event.risk_score,
                        confidence=event.confidence,
                        human_at_risk=event.human_at_risk,
                        humans_nearby_count=1 if event.human_at_risk else 0,
                        snapshot_url=event.snapshot_url,
                        metadata={
                            "emergencyEventId": event.id,
                            "incidentId": incident_id,
                            "action": "auto_pump",
                            "operator": "system_auto"
                        }
                    )
                )
            except Exception as e:
                logger.error(f"Failed to automatically turn on ESP32 pump: {e}")
