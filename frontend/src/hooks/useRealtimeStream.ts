import { useEffect, useRef, useState } from 'react';
import type { ProcessedFrameMessage } from '../types/detection';

type ConnectionState = 'idle' | 'connecting' | 'connected' | 'reconnecting' | 'error';

const streamPath = '/api/stream/webcam?fps=12&quality=72';
const defaultStreamUrl = normalizeStreamUrl(import.meta.env.VITE_AI_STREAM_URL);

export function useRealtimeStream(streamUrl = defaultStreamUrl, enabled = true) {
  const [frame, setFrame] = useState<ProcessedFrameMessage | null>(null);
  const [state, setState] = useState<ConnectionState>('idle');
  const [error, setError] = useState<string | null>(null);
  const reconnectAttempt = useRef(0);
  const socketRef = useRef<WebSocket | null>(null);
  const reconnectTimer = useRef<number | null>(null);
  const connectTimer = useRef<number | null>(null);

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
          setFrame(message as ProcessedFrameMessage);
        }
        if (message.type === 'stream_error') {
          setError(message.message ?? 'Realtime stream returned an error.');
        }
      };

      socket.onerror = () => {
        if (socketRef.current !== socket) {
          return;
        }
        setState('error');
        setError('Realtime stream connection error.');
      };

      socket.onclose = () => {
        if (!shouldReconnect || socketRef.current !== socket) {
          return;
        }
        reconnectAttempt.current += 1;
        const delay = Math.min(8000, 800 * reconnectAttempt.current);
        setState('reconnecting');
        reconnectTimer.current = window.setTimeout(connect, delay);
      };
    }

    connectTimer.current = window.setTimeout(connect, 150);
    return () => {
      shouldReconnect = false;
      if (connectTimer.current) {
        window.clearTimeout(connectTimer.current);
      }
      if (reconnectTimer.current) {
        window.clearTimeout(reconnectTimer.current);
      }
      socketRef.current?.close();
    };
  }, [enabled, streamUrl]);

  return { frame, state, error };
}

export function buildCameraStreamUrl(camera: { id: string; source: string; streamUrl?: string }) {
  const rawStreamUrl = camera.streamUrl?.trim();
  if (!rawStreamUrl) {
    return defaultStreamUrl;
  }

  const url = new URL(defaultStreamUrl);
  url.searchParams.set('camera_id', camera.id);

  if (camera.source === 'webcam') {
    url.searchParams.set('camera', rawStreamUrl);
  } else {
    url.searchParams.set('source', rawStreamUrl);
  }

  return url.toString();
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
