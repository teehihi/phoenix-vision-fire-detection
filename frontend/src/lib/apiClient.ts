import axios from 'axios';
import type { AlertEvent, DetectionEvent, EmergencyEvent, EmergencyStatus, IncidentTimelineEvent } from '../types/detection';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:8000/api/v1'
});

export async function getDetectionHistory() {
  const response = await api.get<DetectionEvent[]>('/detections');
  return response.data;
}

export async function getAlerts() {
  const response = await api.get<AlertEvent[]>('/alerts');
  return response.data;
}

export async function getEmergencyStatus(cameraId = 'webcam-01') {
  const response = await api.get<EmergencyStatus>('/emergency/current', { params: { camera_id: cameraId } });
  return response.data;
}

export async function getEmergencyEvents() {
  const response = await api.get<EmergencyEvent[]>('/emergency/events');
  return response.data;
}

export async function acknowledgeEmergency(eventId: string) {
  const response = await api.post<EmergencyEvent>(`/emergency/events/${eventId}/acknowledge`);
  return response.data;
}

export async function resolveEmergency(eventId: string) {
  const response = await api.post<EmergencyEvent>(`/emergency/events/${eventId}/resolve`);
  return response.data;
}

export type IncidentTimelineFilters = {
  riskLevel?: string;
  eventType?: string;
  dateFrom?: string;
  dateTo?: string;
};

export async function getIncidentTimeline(filters: IncidentTimelineFilters = {}) {
  const response = await api.get<IncidentTimelineEvent[]>('/incident-timeline', {
    params: {
      risk_level: filters.riskLevel || undefined,
      event_type: filters.eventType || undefined,
      date_from: filters.dateFrom || undefined,
      date_to: filters.dateTo || undefined
    }
  });
  return response.data;
}

export async function sendFrameForDetection(frame: Blob, cameraId: string) {
  const formData = new FormData();
  formData.append('file', frame);
  formData.append('camera_id', cameraId);

  const response = await api.post<DetectionEvent[]>('/detections/frame', formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  });

  return response.data;
}
