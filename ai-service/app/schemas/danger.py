from enum import StrEnum

from pydantic import BaseModel, Field

from app.schemas.detection import BoundingBox


class RiskLevel(StrEnum):
    LOW = "LOW"
    MEDIUM = "MEDIUM"
    HIGH = "HIGH"
    CRITICAL = "CRITICAL"


class DangerZone(BaseModel):
    source_label: str
    confidence: float
    box: BoundingBox


class HumanRisk(BaseModel):
    person_box: BoundingBox
    nearest_zone: DangerZone
    distance_ratio: float
    inside_danger_zone: bool


class RiskFactors(BaseModel):
    fire_area_score: float = 0.0
    smoke_density_score: float = 0.0
    duration_score: float = 0.0
    human_nearby_score: float = 0.0
    proximity_score: float = 0.0
    consistency_score: float = 0.0


class DangerAnalysisResult(BaseModel):
    risk_level: RiskLevel
    risk_score: float
    status: str
    fire_detected: bool = False
    smoke_detected: bool = False
    human_detected: bool = False
    human_at_risk: bool = False
    duration_seconds: float = 0.0
    frame_consistency: float = 0.0
    humans_detected_count: int = 0
    humans_nearby_count: int = 0
    fire_area_ratio: float = 0.0
    smoke_area_ratio: float = 0.0
    risk_factors: RiskFactors = Field(default_factory=RiskFactors)
    danger_zones: list[DangerZone] = Field(default_factory=list)
    humans_at_risk: list[HumanRisk] = Field(default_factory=list)
