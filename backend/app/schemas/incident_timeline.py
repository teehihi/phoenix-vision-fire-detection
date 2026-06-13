from datetime import datetime
from typing import Annotated

from pydantic import BaseModel, ConfigDict, Field

from app.models.incident_timeline import IncidentEventType, IncidentRiskLevel


class IncidentTimelineEventCreate(BaseModel):
    camera_id: Annotated[str, Field(validation_alias="cameraId")] = "webcam-0"
    event_type: Annotated[IncidentEventType, Field(validation_alias="eventType")]
    title: str
    description: str
    risk_level: Annotated[IncidentRiskLevel, Field(validation_alias="riskLevel")]
    confidence: float | None = None
    risk_score: Annotated[float | None, Field(validation_alias="riskScore")] = None
    fire_area_ratio: Annotated[float | None, Field(validation_alias="fireAreaRatio")] = None
    smoke_area_ratio: Annotated[float | None, Field(validation_alias="smokeAreaRatio")] = None
    human_at_risk: Annotated[bool, Field(validation_alias="humanAtRisk")] = False
    humans_nearby_count: Annotated[int, Field(validation_alias="humansNearbyCount")] = 0
    snapshot_url: Annotated[str | None, Field(validation_alias="snapshotUrl")] = None
    metadata: dict[str, str | int | float | bool | None] = Field(default_factory=dict)

    model_config = ConfigDict(populate_by_name=True)


class IncidentTimelineEventResponse(BaseModel):
    id: str
    camera_id: str = Field(serialization_alias="cameraId")
    event_type: IncidentEventType = Field(serialization_alias="eventType")
    title: str
    description: str
    risk_level: IncidentRiskLevel = Field(serialization_alias="riskLevel")
    confidence: float | None = None
    risk_score: float | None = Field(default=None, serialization_alias="riskScore")
    fire_area_ratio: float | None = Field(default=None, serialization_alias="fireAreaRatio")
    smoke_area_ratio: float | None = Field(default=None, serialization_alias="smokeAreaRatio")
    human_at_risk: bool = Field(serialization_alias="humanAtRisk")
    humans_nearby_count: int = Field(serialization_alias="humansNearbyCount")
    snapshot_url: str | None = Field(default=None, serialization_alias="snapshotUrl")
    metadata: dict[str, str | int | float | bool | None]
    created_at: datetime = Field(serialization_alias="createdAt")

    model_config = ConfigDict(from_attributes=True, populate_by_name=True)
