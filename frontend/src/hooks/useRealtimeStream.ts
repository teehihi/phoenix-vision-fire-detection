import { useEffect, useRef, useState } from 'react';
import type { ProcessedFrameMessage } from '../types/detection';

type ConnectionState = 'idle' | 'connecting' | 'connected' | 'reconnecting' | 'error';

const defaultStreamUrl = import.meta.env.VITE_AI_STREAM_URL ?? 'ws://localhost:8001/api/stream/webcam?fps=12&quality=72';

export function useRealtimeStream(streamUrl = defaultStreamUrl) {
  const [frame, setFrame] = useState<ProcessedFrameMessage | null>(null);
  const [state, setState] = useState<ConnectionState>('idle');
  const [error, setError] = useState<string | null>(null);
  const reconnectAttempt = useRef(0);
  const socketRef = useRef<WebSocket | null>(null);
  const reconnectTimer = useRef<number | null>(null);

  useEffect(() => {
    let shouldReconnect = true;

    function connect() {
      setState(reconnectAttempt.current ? 'reconnecting' : 'connecting');
      const socket = new WebSocket(streamUrl);
      socketRef.current = socket;

      socket.onopen = () => {
        reconnectAttempt.current = 0;
        setState('connected');
        setError(null);
      };

      socket.onmessage = (event) => {
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
        setState('error');
        setError('Realtime stream connection error.');
      };

      socket.onclose = () => {
        if (!shouldReconnect) {
          return;
        }
        reconnectAttempt.current += 1;
        const delay = Math.min(8000, 800 * reconnectAttempt.current);
        setState('reconnecting');
        reconnectTimer.current = window.setTimeout(connect, delay);
      };
    }

    connect();
    return () => {
      shouldReconnect = false;
      if (reconnectTimer.current) {
        window.clearTimeout(reconnectTimer.current);
      }
      socketRef.current?.close();
    };
  }, [streamUrl]);

  return { frame, state, error };
}
