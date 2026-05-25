import axios from 'axios';
import type { AlertEvent, DetectionEvent } from '../types/detection';

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

export async function sendFrameForDetection(frame: Blob, cameraId: string) {
  const formData = new FormData();
  formData.append('file', frame);
  formData.append('camera_id', cameraId);

  const response = await api.post<DetectionEvent[]>('/detections/frame', formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  });

  return response.data;
}
