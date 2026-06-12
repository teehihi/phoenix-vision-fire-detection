from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field

from app.models.alert import AlertStatus
from app.models.detection import DetectionSeverity


class AlertResponse(BaseModel):
    id: str
    detection_id: str = Field(serialization_alias="detectionId")
    camera_id: str = Field(serialization_alias="cameraId")
    label: str
    incident_id: str = Field(serialization_alias="incidentId")
    title: str
    message: str
    severity: DetectionSeverity
    status: AlertStatus
    snapshot_url: str | None = Field(default=None, serialization_alias="snapshotUrl")
    occurrence_count: int = Field(serialization_alias="occurrenceCount")
    created_at: datetime = Field(serialization_alias="createdAt")
    last_seen_at: datetime = Field(serialization_alias="lastSeenAt")

    model_config = ConfigDict(from_attributes=True, populate_by_name=True)
