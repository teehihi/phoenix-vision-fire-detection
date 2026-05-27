from datetime import datetime
from enum import StrEnum
from uuid import uuid4

from pydantic import BaseModel, Field


class EmergencyState(StrEnum):
    monitoring = "monitoring"
    warning = "warning"
    emergency = "emergency"
    critical = "critical"


class EmergencyEvent(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid4()))
    camera_id: str
    state: EmergencyState
    previous_state: EmergencyState
    risk_level: str
    risk_score: float
    human_at_risk: bool = False
    message: str
    snapshot_url: str | None = None
    escalation_count: int = 0
    created_at: datetime = Field(default_factory=datetime.utcnow)
    acknowledged_at: datetime | None = None
    resolved_at: datetime | None = None


class EmergencyStatus(BaseModel):
    camera_id: str
    state: EmergencyState = EmergencyState.monitoring
    risk_level: str = "LOW"
    risk_score: float = 0.0
    human_at_risk: bool = False
    active_event_id: str | None = None
    snapshot_url: str | None = None
    escalation_count: int = 0
    last_transition_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)
