from datetime import datetime
from typing import Annotated

from pydantic import BaseModel, ConfigDict, Field

from app.models.emergency import EmergencyState


class EmergencyEventCreate(BaseModel):
    camera_id: Annotated[str, Field(validation_alias="cameraId")] = "webcam-0"
    risk_level: Annotated[str, Field(validation_alias="riskLevel")]
    risk_score: Annotated[float, Field(validation_alias="riskScore")]
    human_at_risk: Annotated[bool, Field(validation_alias="humanAtRisk")] = False
    snapshot_url: Annotated[str | None, Field(validation_alias="snapshotUrl")] = None
    message: str | None = None

    model_config = ConfigDict(populate_by_name=True)


class EmergencyEventResponse(BaseModel):
    id: str
    camera_id: str = Field(serialization_alias="cameraId")
    state: EmergencyState
    previous_state: EmergencyState = Field(serialization_alias="previousState")
    risk_level: str = Field(serialization_alias="riskLevel")
    risk_score: float = Field(serialization_alias="riskScore")
    human_at_risk: bool = Field(serialization_alias="humanAtRisk")
    message: str
    snapshot_url: str | None = Field(default=None, serialization_alias="snapshotUrl")
    escalation_count: int = Field(serialization_alias="escalationCount")
    created_at: datetime = Field(serialization_alias="createdAt")
    acknowledged_at: datetime | None = Field(default=None, serialization_alias="acknowledgedAt")
    resolved_at: datetime | None = Field(default=None, serialization_alias="resolvedAt")

    model_config = ConfigDict(from_attributes=True, populate_by_name=True)


class EmergencyStatusResponse(BaseModel):
    camera_id: str = Field(serialization_alias="cameraId")
    state: EmergencyState
    risk_level: str = Field(serialization_alias="riskLevel")
    risk_score: float = Field(serialization_alias="riskScore")
    human_at_risk: bool = Field(serialization_alias="humanAtRisk")
    active_event_id: str | None = Field(default=None, serialization_alias="activeEventId")
    snapshot_url: str | None = Field(default=None, serialization_alias="snapshotUrl")
    escalation_count: int = Field(serialization_alias="escalationCount")
    last_transition_at: datetime = Field(serialization_alias="lastTransitionAt")
    updated_at: datetime = Field(serialization_alias="updatedAt")

    model_config = ConfigDict(from_attributes=True, populate_by_name=True)
