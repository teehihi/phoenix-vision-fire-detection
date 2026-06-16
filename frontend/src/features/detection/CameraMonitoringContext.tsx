import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type MutableRefObject,
  type ReactNode
} from 'react';
import {
  buildCameraStreamUrl,
  useRealtimeStream,
  type ConnectionState
} from '../../hooks/useRealtimeStream';
import type { EmergencyState, ProcessedFrameMessage, RealtimeRiskPayload } from '../../types/detection';
import { triggerIotAlarm, turnOnPump } from '../../lib/apiClient';
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
  cameraLabel: string;
  title: string;
  body: string;
  state: EmergencyState;
  riskLevel: RealtimeRiskPayload['riskLevel'];
  riskScore: number;
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
  localWebcamEnabled: boolean;
};

const CameraMonitoringContext = createContext<CameraMonitoringContextValue | null>(null);

const riskPriority: Record<RealtimeRiskPayload['riskLevel'], number> = {
  LOW: 0,
  MEDIUM: 1,
  HIGH: 2,
  CRITICAL: 3
};
const emergencyStatePriority: Record<EmergencyState, number> = {
  monitoring: 0,
  warning: 1,
  emergency: 2,
  critical: 3
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
    setCamerasEnabled: setCamerasEnabledRegistry
  } = useCameraRegistry();

  const [localWebcamEnabled, setLocalWebcamEnabled] = useState(() => {
    const stored = localStorage.getItem('local_webcam_enabled');
    return stored !== 'false';
  });

  const primaryStream = useRealtimeStream(undefined, localWebcamEnabled);
  const [cameraRuntimes, setCameraRuntimes] = useState<Record<string, CameraRuntime>>({});
  const [toasts, setToasts] = useState<MonitoringToast[]>([]);
  const lastRiskLevelByCamera = useRef<Record<string, RealtimeRiskPayload['riskLevel']>>({});
  const dismissedRiskLevelByCamera = useRef<Record<string, RealtimeRiskPayload['riskLevel']>>({});
  const lastNotifiedStateByCamera = useRef<Record<string, EmergencyState>>({});
  const lowRiskSinceByCamera = useRef<Record<string, number>>({});
  const lastSpacePumpAtRef = useRef(0);
  const lastIotAlarmLevelRef = useRef<string | null>(null);
  const pendingIotAlarmLevelRef = useRef<string | null>(null);
  const cameraNames = useMemo(
    () => Object.fromEntries(registryCameras.map((camera) => [camera.id, camera.name])),
    [registryCameras]
  );

  const dismissToast = useCallback((toastId: string) => {
    const currentRiskLevel = lastRiskLevelByCamera.current[toastId];
    if (currentRiskLevel) {
      dismissedRiskLevelByCamera.current[toastId] = currentRiskLevel;
    }
    setToasts((current) => current.filter((toast) => toast.id !== toastId));
  }, []);

  const publishRiskNotification = useCallback((frame: ProcessedFrameMessage) => {
    const riskLevel = frame.risk.riskLevel;
    lastRiskLevelByCamera.current[frame.cameraId] = riskLevel;
    const existingToastId = frame.cameraId;

    if (riskLevel === 'LOW') {
      const lowSince = lowRiskSinceByCamera.current[frame.cameraId] ?? Date.now();
      lowRiskSinceByCamera.current[frame.cameraId] = lowSince;

      // Debounce LOW state for 1 second before clearing notification state
      if (Date.now() - lowSince > 1000) {
        delete dismissedRiskLevelByCamera.current[frame.cameraId];
        delete lastNotifiedStateByCamera.current[frame.cameraId];
        lastIotAlarmLevelRef.current = null;
        pendingIotAlarmLevelRef.current = null;
        setToasts((current) => current.filter((toast) => toast.id !== existingToastId));
      }
      return;
    }

    // If we're not LOW, clear the low risk timer
    delete lowRiskSinceByCamera.current[frame.cameraId];
    syncIotAlarmForRisk(riskLevel, lastIotAlarmLevelRef, pendingIotAlarmLevelRef);

    const state = riskToEmergencyState(riskLevel);
    const previousNotifiedState = lastNotifiedStateByCamera.current[frame.cameraId] ?? 'monitoring';
    const isEscalating = emergencyStatePriority[state] > emergencyStatePriority[previousNotifiedState];

    if (isEscalating) {
      delete dismissedRiskLevelByCamera.current[frame.cameraId];
    }
    if (dismissedRiskLevelByCamera.current[frame.cameraId] === riskLevel) {
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
      if (existing.state === toast.state) {
        return current;
      }
      const next = [...current];
      next[existingIndex] = toast;
      return next;
    });

    if (isEscalating) {
      lastNotifiedStateByCamera.current[frame.cameraId] = state;
    }

    if (isEscalating && 'Notification' in window && Notification.permission === 'granted') {
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
    } else if (runtime.state !== 'connected') {
      lastRiskLevelByCamera.current[cameraId] = 'LOW';
      delete dismissedRiskLevelByCamera.current[cameraId];
      setToasts((current) => current.filter((toast) => toast.cameraId !== cameraId));
    }
  }, [publishRiskNotification]);

  useEffect(() => {
    if (primaryStream.frame) {
      publishRiskNotification(primaryStream.frame);
    } else if (primaryStream.state !== 'connected') {
      lastRiskLevelByCamera.current['webcam-0'] = 'LOW';
      delete dismissedRiskLevelByCamera.current['webcam-0'];
      setToasts((current) => current.filter((toast) => toast.cameraId !== 'webcam-0'));
    }
  }, [primaryStream.frame, primaryStream.state, publishRiskNotification]);

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

  const setCamerasEnabled = useCallback(async (cameraIds: string[], enabled: boolean) => {
    const hasWebcam = cameraIds.includes('webcam-0');
    const registryIds = cameraIds.filter((id) => id !== 'webcam-0');

    if (hasWebcam) {
      setLocalWebcamEnabled(enabled);
      localStorage.setItem('local_webcam_enabled', String(enabled));
    }

    if (registryIds.length > 0) {
      await setCamerasEnabledRegistry(registryIds, enabled);
    }
  }, [setCamerasEnabledRegistry]);

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
    setCamerasEnabled,
    localWebcamEnabled
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
    updateCamera,
    localWebcamEnabled
  ]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      const isTyping = target?.tagName === 'INPUT' || target?.tagName === 'TEXTAREA' || target?.isContentEditable;
      const canManuallyStartPump = highestEmergencyState === 'warning' || highestEmergencyState === 'emergency';
      if (e.code === 'Space' && !isTyping && canManuallyStartPump) {
        const now = Date.now();
        if (now - lastSpacePumpAtRef.current < 1000) {
          return;
        }
        lastSpacePumpAtRef.current = now;
        e.preventDefault();
        turnOnPump().catch((err) => console.error('Failed to trigger pump via Spacebar', err));
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [highestEmergencyState]);

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
  const hasConfiguredSource = camera.source !== 'youtube' && (camera.source === 'webcam' || Boolean(camera.streamUrl.trim()));
  const stream = useRealtimeStream(streamUrl, camera.enabled && hasConfiguredSource);

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
  const body = `${cameraLabel}: ${getRiskMessage(riskLevel, frame.risk.humanAtRisk)} Risk ${Math.round(frame.risk.riskScore)}/100`;

  return {
    id: frame.cameraId,
    cameraId: frame.cameraId,
    cameraLabel,
    title,
    body,
    state,
    riskLevel,
    riskScore: Math.round(frame.risk.riskScore)
  };
}

function getRiskMessage(riskLevel: RealtimeRiskPayload['riskLevel'], humanAtRisk: boolean) {
  if (riskLevel === 'CRITICAL') return 'Sự cố khẩn cấp đang diễn ra.';
  if (riskLevel === 'HIGH') return humanAtRisk ? 'Có người trong vùng nguy hiểm.' : 'Nguy cơ cháy cao đang được theo dõi.';
  return 'Có dấu hiệu bất thường, tiếp tục giám sát.';
}

function syncIotAlarmForRisk(
  riskLevel: RealtimeRiskPayload['riskLevel'],
  lastAlarmLevelRef: MutableRefObject<string | null>,
  pendingAlarmLevelRef: MutableRefObject<string | null>
) {
  const level = riskLevel === 'CRITICAL' ? 'critical' : riskLevel === 'HIGH' ? 'high' : riskLevel === 'MEDIUM' ? 'medium' : null;
  if (!level) {
    return;
  }

  if (lastAlarmLevelRef.current === level || pendingAlarmLevelRef.current === level) {
    return;
  }

  pendingAlarmLevelRef.current = level;
  triggerIotAlarm(level)
    .then(() => {
      lastAlarmLevelRef.current = level;
    })
    .catch((err) => {
      console.error('Failed to sync ESP32 alarm:', err);
      window.setTimeout(() => {
        triggerIotAlarm(level)
          .then(() => {
            lastAlarmLevelRef.current = level;
          })
          .catch((retryError) => console.error('Failed to retry ESP32 alarm:', retryError))
          .finally(() => {
            if (pendingAlarmLevelRef.current === level) {
              pendingAlarmLevelRef.current = null;
            }
          });
      }, 700);
    })
    .finally(() => {
      if (pendingAlarmLevelRef.current === level) {
        pendingAlarmLevelRef.current = null;
      }
    });
}

function riskToEmergencyState(riskLevel: RealtimeRiskPayload['riskLevel']): EmergencyState {
  if (riskLevel === 'CRITICAL') return 'critical';
  if (riskLevel === 'HIGH') return 'emergency';
  if (riskLevel === 'MEDIUM') return 'warning';
  return 'monitoring';
}
