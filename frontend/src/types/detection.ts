export type DetectionSeverity = 'low' | 'medium' | 'high' | 'critical';

export type BoundingBox = {
  x: number;
  y: number;
  width: number;
  height: number;
};

export type RealtimeRiskPayload = {
  riskLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  riskScore: number;
  status: string;
  humanAtRisk: boolean;
  durationSeconds: number;
  frameConsistency: number;
  humansDetectedCount?: number;
  humansNearbyCount: number;
  fireDetected?: boolean;
  smokeDetected?: boolean;
  humanDetected?: boolean;
  fireAreaRatio?: number;
  smokeAreaRatio?: number;
};

export type ProcessedFrameMessage = {
  type: 'processed_frame';
  cameraId: string;
  timestamp: number;
  fps: number;
  frame: string;
  detections: Array<{
    label: string;
    confidence: number;
    boxes: BoundingBox[];
  }>;
  risk: RealtimeRiskPayload;
};

export type DetectionEvent = {
  id: string;
  cameraId: string;
  label: 'fire' | 'smoke';
  confidence: number;
  severity: DetectionSeverity;
  boxes: BoundingBox[];
  snapshotUrl?: string | null;
  createdAt: string;
};

export type AlertEvent = {
  id: string;
  detectionId: string;
  cameraId: string;
  label: string;
  incidentId: string;
  title: string;
  message: string;
  severity: DetectionSeverity;
  status: 'open' | 'acknowledged' | 'resolved';
  snapshotUrl?: string | null;
  occurrenceCount: number;
  createdAt: string;
  lastSeenAt: string;
};

export type EmergencyState = 'monitoring' | 'warning' | 'emergency' | 'critical';

export type EmergencyStatus = {
  cameraId: string;
  state: EmergencyState;
  riskLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  riskScore: number;
  humanAtRisk: boolean;
  activeEventId?: string | null;
  snapshotUrl?: string | null;
  escalationCount: number;
  lastTransitionAt: string;
  updatedAt: string;
};

export type EmergencyEvent = {
  id: string;
  cameraId: string;
  state: EmergencyState;
  previousState: EmergencyState;
  riskLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  riskScore: number;
  humanAtRisk: boolean;
  message: string;
  snapshotUrl?: string | null;
  escalationCount: number;
  createdAt: string;
  acknowledgedAt?: string | null;
  resolvedAt?: string | null;
};

export type IncidentEventType = 'detection' | 'risk_change' | 'emergency_transition' | 'snapshot' | 'operator_action';

export type IncidentTimelineEvent = {
  id: string;
  cameraId: string;
  eventType: IncidentEventType;
  title: string;
  description: string;
  riskLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  confidence?: number | null;
  riskScore?: number | null;
  fireAreaRatio?: number | null;
  smokeAreaRatio?: number | null;
  humanAtRisk: boolean;
  humansNearbyCount: number;
  snapshotUrl?: string | null;
  metadata: Record<string, string | number | boolean | null>;
  createdAt: string;
};
