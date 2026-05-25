export type DetectionSeverity = 'low' | 'medium' | 'high' | 'critical';

export type BoundingBox = {
  x: number;
  y: number;
  width: number;
  height: number;
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
  title: string;
  message: string;
  severity: DetectionSeverity;
  status: 'open' | 'acknowledged' | 'resolved';
  createdAt: string;
};
