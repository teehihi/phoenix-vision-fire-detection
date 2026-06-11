import axios from 'axios';
import { onAuthStateChanged, type User } from 'firebase/auth';
import { auth } from './firebase';
import type { AlertEvent, DetectionEvent, EmergencyEvent, EmergencyStatus, IncidentTimelineEvent } from '../types/detection';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:8000/api/v1'
});

let tokenUserId: string | null = null;

async function getAuthenticatedUser() {
  await auth.authStateReady();
  if (auth.currentUser) {
    return auth.currentUser;
  }

  return new Promise<User | null>((resolve) => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      unsubscribe();
      resolve(user);
    });
  });
}

api.interceptors.request.use(async (config) => {
  const user = await getAuthenticatedUser();
  delete config.headers.Authorization;

  if (user) {
    const userChanged = tokenUserId !== null && tokenUserId !== user.uid;
    tokenUserId = user.uid;
    config.headers.Authorization = `Bearer ${await user.getIdToken(userChanged)}`;
  } else {
    tokenUserId = null;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config as (typeof error.config & { _authRetried?: boolean }) | undefined;
    if (error.response?.status !== 401 || !originalRequest || originalRequest._authRetried) {
      throw error;
    }

    const user = await getAuthenticatedUser();
    if (!user) {
      throw error;
    }

    originalRequest._authRetried = true;
    tokenUserId = user.uid;
    originalRequest.headers.Authorization = `Bearer ${await user.getIdToken(true)}`;
    return api.request(originalRequest);
  }
);

export async function getDetectionHistory() {
  const response = await api.get<DetectionEvent[]>('/detections');
  return response.data;
}

export async function getAlerts() {
  const response = await api.get<AlertEvent[]>('/alerts');
  return response.data;
}

export async function deleteAlert(alertId: string) {
  const response = await api.delete(`/alerts/${alertId}`);
  return response.data;
}

export async function clearAllAlerts() {
  const response = await api.delete('/alerts');
  return response.data;
}

export async function deleteTimelineEvent(eventId: string) {
  const response = await api.delete(`/incident-timeline/${eventId}`);
  return response.data;
}

export async function clearAllTimelineEvents() {
  const response = await api.delete('/incident-timeline');
  return response.data;
}

export async function getEmergencyStatus(cameraId = 'webcam-0') {
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

export async function triggerMockEmergency(payload: {
  cameraId?: string;
  riskLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  riskScore: number;
  humanAtRisk: boolean;
  message?: string;
  snapshotUrl?: string;
}) {
  const response = await api.post('/emergency/events', payload);
  return response.data;
}

export type IncidentTimelineFilters = {
  cameraId?: string;
  riskLevel?: string;
  eventType?: string;
  dateFrom?: string;
  dateTo?: string;
};

export async function getIncidentTimeline(filters: IncidentTimelineFilters = {}) {
  const response = await api.get<IncidentTimelineEvent[]>('/incident-timeline', {
    params: {
      camera_id: filters.cameraId || undefined,
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

export async function requestRegistrationOtp(email: string) {
  const response = await api.post<{ challenge_token: string; expires_in_seconds: number }>('/auth/registration-otp', { email });
  return response.data;
}

export async function verifyRegistrationOtp(email: string, otp: string, challengeToken: string) {
  const response = await api.post<{ verified: boolean }>('/auth/registration-otp/verify', {
    email,
    otp,
    challenge_token: challengeToken
  });
  return response.data;
}

export async function getIotStatus() {
  const response = await api.get<{ device: string; online: boolean; alarm: boolean }>('/iot/status');
  return response.data;
}

export async function triggerIotAlarm() {
  const response = await api.post<{ success: boolean; alarm: boolean }>('/iot/alarm');
  return response.data;
}

export async function stopIotAlarm() {
  const response = await api.post<{ success: boolean; alarm: boolean }>('/iot/stop');
  return response.data;
}
