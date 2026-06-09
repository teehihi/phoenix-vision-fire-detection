import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode
} from 'react';
import {
  buildCameraStreamUrl,
  useRealtimeStream,
  type ConnectionState
} from '../../hooks/useRealtimeStream';
import type { EmergencyState, ProcessedFrameMessage, RealtimeRiskPayload } from '../../types/detection';
import {
  useCameraRegistry,
  type CameraRegistryInput,
  type CameraRegistryItem
} from './useCameraRegistry';

export type CameraRuntime = {
  frame: ProcessedFrameMessage | null;
  state: ConnectionState;
  error: string | null;
};

export type MonitoringToast = {
  id: string;
  cameraId: string;
  title: string;
  body: string;
  state: EmergencyState;
};

type CameraMonitoringContextValue = {
  registryCameras: CameraRegistryItem[];
  camerasLoading: boolean;
  cameraRegistryError: string | null;
  primaryStream: CameraRuntime;
  cameraRuntimes: Record<string, CameraRuntime>;
  toasts: MonitoringToast[];
  highestEmergencyState: EmergencyState;
  dismissToast: (toastId: string) => void;
  createCamera: (input: CameraRegistryInput) => Promise<void>;
  updateCamera: (cameraId: string, input: CameraRegistryInput) => Promise<void>;
  deleteCamera: (cameraId: string) => Promise<void>;
  deleteCameras: (cameraIds: string[]) => Promise<void>;
  setCamerasEnabled: (cameraIds: string[], enabled: boolean) => Promise<void>;
};

const CameraMonitoringContext = createContext<CameraMonitoringContextValue | null>(null);

const riskPriority: Record<RealtimeRiskPayload['riskLevel'], number> = {
  LOW: 0,
  MEDIUM: 1,
  HIGH: 2,
  CRITICAL: 3
};

export function CameraMonitoringProvider({ children }: { children: ReactNode }) {
  const {
    cameras: registryCameras,
    loading: camerasLoading,
    error: cameraRegistryError,
    createCamera,
    updateCamera,
    deleteCamera,
    deleteCameras,
    setCamerasEnabled
  } = useCameraRegistry();
  const primaryStream = useRealtimeStream();
  const [cameraRuntimes, setCameraRuntimes] = useState<Record<string, CameraRuntime>>({});
  const [toasts, setToasts] = useState<MonitoringToast[]>([]);
  const lastRiskLevelByCamera = useRef<Record<string, RealtimeRiskPayload['riskLevel']>>({});
  const cameraNames = useMemo(
    () => Object.fromEntries(registryCameras.map((camera) => [camera.id, camera.name])),
    [registryCameras]
  );

  const dismissToast = useCallback((toastId: string) => {
    setToasts((current) => current.filter((toast) => toast.id !== toastId));
  }, []);

  const publishRiskNotification = useCallback((frame: ProcessedFrameMessage) => {
    const riskLevel = frame.risk.riskLevel;
    const previousRiskLevel = lastRiskLevelByCamera.current[frame.cameraId] ?? 'LOW';
    lastRiskLevelByCamera.current[frame.cameraId] = riskLevel;
    const existingToastId = frame.cameraId;

    if (riskLevel === 'LOW') {
      dismissToast(existingToastId);
      return;
    }

    const cameraLabel = cameraNames[frame.cameraId] ?? (frame.cameraId === 'webcam-0' ? 'Webcam local' : frame.cameraId);
    const toast = createRiskToast(frame, cameraLabel);
    setToasts((current) => {
      const existingIndex = current.findIndex((item) => item.cameraId === frame.cameraId);
      if (existingIndex === -1) {
        return [...current.slice(-3), toast];
      }
      const existing = current[existingIndex];
      if (existing.body === toast.body && existing.state === toast.state) {
        return current;
      }
      const next = [...current];
      next[existingIndex] = toast;
      return next;
    });

    if (riskLevel !== previousRiskLevel && 'Notification' in window && Notification.permission === 'granted') {
      new Notification(toast.title, {
        body: toast.body,
        requireInteraction: riskLevel === 'HIGH' || riskLevel === 'CRITICAL',
        silent: false
      });
    }
  }, [cameraNames, dismissToast]);

  const updateCameraRuntime = useCallback((cameraId: string, runtime: CameraRuntime) => {
    setCameraRuntimes((current) => {
      const previous = current[cameraId];
      if (previous?.frame === runtime.frame && previous?.state === runtime.state && previous?.error === runtime.error) {
        return current;
      }
      return { ...current, [cameraId]: runtime };
    });
    if (runtime.frame) {
      publishRiskNotification(runtime.frame);
    }
  }, [publishRiskNotification]);

  useEffect(() => {
    if (primaryStream.frame) {
      publishRiskNotification(primaryStream.frame);
    }
  }, [primaryStream.frame, publishRiskNotification]);

  useEffect(() => {
    const activeIds = new Set(registryCameras.map((camera) => camera.id));
    setCameraRuntimes((current) =>
      Object.fromEntries(Object.entries(current).filter(([cameraId]) => activeIds.has(cameraId)))
    );
  }, [registryCameras]);

  useEffect(() => {
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }
  }, []);

  const highestEmergencyState = useMemo(() => {
    const riskLevels = [
      primaryStream.frame?.risk.riskLevel ?? 'LOW',
      ...Object.values(cameraRuntimes).map((runtime) => runtime.frame?.risk.riskLevel ?? 'LOW')
    ];
    const highestRisk = riskLevels.reduce<RealtimeRiskPayload['riskLevel']>(
      (highest, current) => riskPriority[current] > riskPriority[highest] ? current : highest,
      'LOW'
    );
    return riskToEmergencyState(highestRisk);
  }, [cameraRuntimes, primaryStream.frame]);

  const value = useMemo<CameraMonitoringContextValue>(() => ({
    registryCameras,
    camerasLoading,
    cameraRegistryError,
    primaryStream,
    cameraRuntimes,
    toasts,
    highestEmergencyState,
    dismissToast,
    createCamera,
    updateCamera,
    deleteCamera,
    deleteCameras,
    setCamerasEnabled
  }), [
    cameraRegistryError,
    cameraRuntimes,
    camerasLoading,
    createCamera,
    deleteCamera,
    deleteCameras,
    dismissToast,
    highestEmergencyState,
    primaryStream,
    registryCameras,
    setCamerasEnabled,
    toasts,
    updateCamera
  ]);

  return (
    <CameraMonitoringContext.Provider value={value}>
      {registryCameras.map((camera) => (
        <CameraStreamConnector key={camera.id} camera={camera} onUpdate={updateCameraRuntime} />
      ))}
      {children}
    </CameraMonitoringContext.Provider>
  );
}

export function useCameraMonitoring() {
  const context = useContext(CameraMonitoringContext);
  if (!context) {
    throw new Error('useCameraMonitoring must be used inside CameraMonitoringProvider.');
  }
  return context;
}

function CameraStreamConnector({
  camera,
  onUpdate
}: {
  camera: CameraRegistryItem;
  onUpdate: (cameraId: string, runtime: CameraRuntime) => void;
}) {
  const streamUrl = useMemo(() => buildCameraStreamUrl(camera), [camera]);
  const stream = useRealtimeStream(streamUrl, camera.enabled && Boolean(camera.streamUrl.trim()));

  useEffect(() => {
    onUpdate(camera.id, stream);
  }, [camera.id, onUpdate, stream.error, stream.frame, stream.state]);

  return null;
}

function createRiskToast(frame: ProcessedFrameMessage, cameraLabel: string): MonitoringToast {
  const riskLevel = frame.risk.riskLevel;
  const state = riskToEmergencyState(riskLevel);
  const title = riskLevel === 'CRITICAL'
    ? 'CẢNH BÁO NGUY HIỂM'
    : riskLevel === 'HIGH'
      ? 'PHÁT HIỆN NGUY CƠ CHÁY CAO'
      : 'CẢNH BÁO NGUY CƠ';
  const body = `${cameraLabel}: ${frame.risk.status} - Risk ${Math.round(frame.risk.riskScore)}/100`;

  return {
    id: frame.cameraId,
    cameraId: frame.cameraId,
    title,
    body,
    state
  };
}

function riskToEmergencyState(riskLevel: RealtimeRiskPayload['riskLevel']): EmergencyState {
  if (riskLevel === 'CRITICAL') return 'critical';
  if (riskLevel === 'HIGH') return 'emergency';
  if (riskLevel === 'MEDIUM') return 'warning';
  return 'monitoring';
}
