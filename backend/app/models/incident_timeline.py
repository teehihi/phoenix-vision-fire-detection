from datetime import datetime
from enum import StrEnum
from uuid import uuid4

from pydantic import BaseModel, Field


class IncidentEventType(StrEnum):
    detection = "detection"
    risk_change = "risk_change"
    emergency_transition = "emergency_transition"
    snapshot = "snapshot"
    operator_action = "operator_action"


class IncidentRiskLevel(StrEnum):
    low = "LOW"
    medium = "MEDIUM"
    high = "HIGH"
    critical = "CRITICAL"


class IncidentTimelineEvent(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid4()))
    camera_id: str
    event_type: IncidentEventType
    title: str
    description: str
    risk_level: IncidentRiskLevel
    confidence: float | None = None
    risk_score: float | None = None
    fire_area_ratio: float | None = None
    smoke_area_ratio: float | None = None
    human_at_risk: bool = False
    humans_nearby_count: int = 0
    snapshot_url: str | None = None
    metadata: dict[str, str | int | float | bool | None] = Field(default_factory=dict)
    created_at: datetime = Field(default_factory=datetime.utcnow)
