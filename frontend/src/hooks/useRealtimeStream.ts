import { useEffect, useRef, useState } from 'react';
import type { ProcessedFrameMessage } from '../types/detection';
import { triggerMockEmergency } from '../lib/apiClient';
import { auth } from '../lib/firebase';

export type ConnectionState = 'idle' | 'connecting' | 'connected' | 'reconnecting' | 'error';

const streamPath = '/api/stream/webcam?fps=12&quality=72';
const defaultStreamUrl = normalizeStreamUrl(import.meta.env.VITE_AI_STREAM_URL);
const riskPriority: Record<ProcessedFrameMessage['risk']['riskLevel'], number> = {
  LOW: 0,
  MEDIUM: 1,
  HIGH: 2,
  CRITICAL: 3
};
const incidentResetDelayMs = 10000;
const streamIdleTimeoutMs = 10000;

export function useRealtimeStream(streamUrl = defaultStreamUrl, enabled = true) {
  const [frame, setFrame] = useState<ProcessedFrameMessage | null>(null);
  const [state, setState] = useState<ConnectionState>('idle');
  const [error, setError] = useState<string | null>(null);
  const reconnectAttempt = useRef(0);
  const socketRef = useRef<WebSocket | null>(null);
  const reconnectTimer = useRef<number | null>(null);
  const connectTimer = useRef<number | null>(null);
  const frameWatchdogTimer = useRef<number | null>(null);
  const lastFrameAtRef = useRef(0);
  const pendingSyncRiskLevelRef = useRef<string | null>(null);
  const lastSyncAttemptAtRef = useRef(0);
  const lastSyncedRiskPriorityRef = useRef(0);
  const lowRiskSinceRef = useRef<number | null>(null);

  useEffect(() => {
    if (!enabled) {
      setFrame(null);
      setState('idle');
      setError(null);
      if (connectTimer.current) {
        window.clearTimeout(connectTimer.current);
      }
      if (reconnectTimer.current) {
        window.clearTimeout(reconnectTimer.current);
      }
      if (frameWatchdogTimer.current) {
        window.clearInterval(frameWatchdogTimer.current);
      }
      socketRef.current?.close();
      return;
    }

    let shouldReconnect = true;

    function connect() {
      setState(reconnectAttempt.current ? 'reconnecting' : 'connecting');
      const socket = new WebSocket(streamUrl);
      socketRef.current = socket;

      socket.onopen = () => {
        if (socketRef.current !== socket) {
          return;
        }
        reconnectAttempt.current = 0;
        lastFrameAtRef.current = Date.now();
        setState('connected');
        setError(null);
      };

      socket.onmessage = (event) => {
        if (socketRef.current !== socket) {
          return;
        }
        let message: { type?: string; message?: string };
        try {
          message = JSON.parse(event.data);
        } catch {
          setError('Realtime stream returned an invalid message.');
          return;
        }

        if (message.type === 'processed_frame') {
          const frameMsg = message as ProcessedFrameMessage;
          lastFrameAtRef.current = Date.now();
          setFrame(frameMsg);

          const risk = frameMsg.risk;
          const currentRiskLevel = risk.riskLevel;
          const currentRiskPriority = riskPriority[currentRiskLevel];
          const canRetrySync = Date.now() - lastSyncAttemptAtRef.current >= 3000;

          if (currentRiskLevel === 'LOW') {
            lowRiskSinceRef.current ??= Date.now();
            if (Date.now() - lowRiskSinceRef.current >= incidentResetDelayMs) {
              lastSyncedRiskPriorityRef.current = 0;
              pendingSyncRiskLevelRef.current = null;
            }
            return;
          }

          lowRiskSinceRef.current = null;

          if (
            currentRiskPriority > lastSyncedRiskPriorityRef.current
            && auth.currentUser
            && pendingSyncRiskLevelRef.current !== currentRiskLevel
            && canRetrySync
          ) {
            pendingSyncRiskLevelRef.current = currentRiskLevel;
            lastSyncAttemptAtRef.current = Date.now();
            const maxConfidence = frameMsg.detections && frameMsg.detections.length > 0
              ? Math.max(...frameMsg.detections.map(d => d.confidence))
              : undefined;

            triggerMockEmergency({
              cameraId: frameMsg.cameraId,
              riskLevel: currentRiskLevel,
              riskScore: risk.riskScore,
              confidence: maxConfidence,
              humanAtRisk: risk.humanAtRisk,
              message: `Hệ thống tự động phát hiện cảnh báo nguy cơ: ${risk.status}`,
              snapshotUrl: `data:image/jpeg;base64,${frameMsg.frame}`
            }).then(() => {
              lastSyncedRiskPriorityRef.current = Math.max(lastSyncedRiskPriorityRef.current, currentRiskPriority);
            }).catch(() => {
              // Retry on a later frame after the cooldown.
            }).finally(() => {
              if (pendingSyncRiskLevelRef.current === currentRiskLevel) {
                pendingSyncRiskLevelRef.current = null;
              }
            });
          }
        }
        if (message.type === 'stream_error') {
          setError(message.message ?? 'Realtime stream returned an error.');
        }
      };

      socket.onerror = () => {
        if (socketRef.current !== socket) {
          return;
        }
        setFrame(null);
        setState('error');
        setError('Realtime stream connection error.');
      };

      socket.onclose = () => {
        if (!shouldReconnect || socketRef.current !== socket) {
          return;
        }
        setFrame(null);
        reconnectAttempt.current += 1;
        const delay = Math.min(8000, 800 * reconnectAttempt.current);
        setState('reconnecting');
        reconnectTimer.current = window.setTimeout(connect, delay);
      };
    }

    connectTimer.current = window.setTimeout(connect, 150);
    frameWatchdogTimer.current = window.setInterval(() => {
      if (
        socketRef.current?.readyState === WebSocket.OPEN
        && lastFrameAtRef.current
        && Date.now() - lastFrameAtRef.current > streamIdleTimeoutMs
      ) {
        setFrame(null);
        setState('reconnecting');
        setError('Camera đã ngừng gửi frame. Đang thử kết nối lại.');
        socketRef.current.close();
      }
    }, 500);

    return () => {
      shouldReconnect = false;
      if (connectTimer.current) {
        window.clearTimeout(connectTimer.current);
      }
      if (reconnectTimer.current) {
        window.clearTimeout(reconnectTimer.current);
      }
      if (frameWatchdogTimer.current) {
        window.clearInterval(frameWatchdogTimer.current);
      }
      socketRef.current?.close();
    };
  }, [enabled, streamUrl]);

  return { frame, state, error };
}

export function buildCameraStreamUrl(camera: { id: string; source: string; streamUrl?: string }) {
  const rawStreamUrl = camera.streamUrl?.trim();
  const url = new URL(defaultStreamUrl);
  url.searchParams.set('camera_id', camera.id);

  if (camera.source === 'webcam') {
    url.searchParams.set('camera', rawStreamUrl || '0');
  } else {
    if (!rawStreamUrl) {
      return defaultStreamUrl;
    }
    url.searchParams.set('source', rawStreamUrl);
  }

  return url.toString();
}

export function testCameraConnection(
  camera: { id: string; source: string; streamUrl?: string },
  timeoutMs = 15000
) {
  const streamUrl = new URL(buildCameraStreamUrl(camera));
  streamUrl.searchParams.set('probe', '1');

  return new Promise<{ fps: number }>((resolve, reject) => {
    let settled = false;
    let socket: WebSocket;

    const finish = (callback: () => void) => {
      if (settled) return;
      settled = true;
      window.clearTimeout(timeout);
      socket?.close(1000, 'Connection test complete');
      callback();
    };

    const timeout = window.setTimeout(() => {
      finish(() => reject(new Error('Không nhận được hình ảnh trong thời gian cho phép.')));
    }, timeoutMs);

    try {
      socket = new WebSocket(streamUrl.toString());
    } catch {
      finish(() => reject(new Error('Không thể tạo kết nối tới AI service.')));
      return;
    }

    socket.onmessage = (event) => {
      let message: { type?: string; fps?: number };
      try {
        message = JSON.parse(event.data);
      } catch {
        return;
      }

      if (message.type === 'connection_test' || message.type === 'processed_frame') {
        finish(() => resolve({ fps: Number(message.fps ?? 0) }));
      } else if (message.type === 'stream_error') {
        finish(() => reject(new Error('Camera không trả về hình ảnh. Hãy kiểm tra URL và thông tin đăng nhập.')));
      }
    };

    socket.onerror = () => {
      finish(() => reject(new Error('Không thể kết nối tới camera hoặc AI service.')));
    };

    socket.onclose = () => {
      finish(() => reject(new Error('Kết nối đã đóng trước khi nhận được hình ảnh.')));
    };
  });
}

function normalizeStreamUrl(value?: string) {
  const fallback = `ws://${window.location.hostname || 'localhost'}:8100${streamPath}`;
  const rawValue = value?.trim();

  if (!rawValue) {
    return fallback;
  }

  try {
    const url = new URL(rawValue);
    if (url.pathname === '/' || url.pathname === '') {
      return `${url.origin.replace(/^http/, 'ws')}${streamPath}`;
    }
    return url.toString();
  } catch {
    return fallback;
  }
}
