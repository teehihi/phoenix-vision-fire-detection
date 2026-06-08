import { AnimatePresence, motion } from 'framer-motion';
import {
  Activity,
  AlertTriangle,
  Clock3,
  DoorOpen,
  Edit3,
  Eye,
  EyeOff,
  Flame,
  LayoutGrid,
  MapPin,
  Maximize2,
  Plus,
  RefreshCcw,
  Search,
  SlidersHorizontal,
  Trash2,
  Video,
  Wifi,
  WifiOff,
  X
} from 'lucide-react';
import { type FormEvent, useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { buildCameraStreamUrl, useRealtimeStream } from '../../hooks/useRealtimeStream';
import { getIncidentTimeline } from '../../lib/apiClient';
import type { IncidentTimelineEvent, ProcessedFrameMessage, RealtimeRiskPayload } from '../../types/detection';
import { type CameraRegistryInput, type CameraRegistryItem, type CameraSource, useCameraRegistry } from './useCameraRegistry';

type CameraStatus = 'online' | 'warning' | 'offline';
type RiskLevel = RealtimeRiskPayload['riskLevel'];
type GridMode = 'auto' | 'two' | 'three';
type CameraPanelState = { mode: 'create' } | { mode: 'edit'; camera: CameraItem };

type CameraItem = {
  id: string;
  name: string;
  location: string;
  zone: string;
  source: CameraSource;
  status: CameraStatus;
  riskLevel: RiskLevel;
  riskScore: number;
  fps: number;
  lastSeen: string;
  fire: number;
  smoke: number;
  streamUrl?: string;
  enabled?: boolean;
  isPrimary?: boolean;
  frame?: ProcessedFrameMessage | null;
};

const riskTone: Record<RiskLevel, string> = {
  LOW: 'border-emerald-200 bg-emerald-50 text-emerald-700',
  MEDIUM: 'border-amber-200 bg-amber-50 text-amber-700',
  HIGH: 'border-orange-200 bg-orange-50 text-orange-700',
  CRITICAL: 'border-red-200 bg-red-50 text-red-700'
};

const statusTone: Record<CameraStatus, string> = {
  online: 'border-emerald-200 bg-emerald-50 text-emerald-700',
  warning: 'border-amber-200 bg-amber-50 text-amber-700',
  offline: 'border-slate-200 bg-slate-100 text-slate-500'
};

const statusLabel: Record<CameraStatus, string> = {
  online: 'Đang hoạt động',
  warning: 'Cần chú ý',
  offline: 'Mất kết nối'
};

const cameraRuntimeDefaults: Record<string, Partial<CameraItem>> = {
  'cam-lobby-a01': { status: 'online', riskLevel: 'LOW', riskScore: 8, fps: 15, lastSeen: 'Vừa xong', fire: 0, smoke: 0 },
  'cam-corridor-02': { status: 'warning', riskLevel: 'MEDIUM', riskScore: 42, fps: 12, lastSeen: '12 giây trước', fire: 0, smoke: 1 },
  'cam-parking-b1': { status: 'online', riskLevel: 'LOW', riskScore: 12, fps: 14, lastSeen: 'Vừa xong', fire: 0, smoke: 0 },
  'cam-stairs-03': { status: 'offline', riskLevel: 'LOW', riskScore: 0, fps: 0, lastSeen: '4 phút trước', fire: 0, smoke: 0 }
};

export function LiveDetectionPage() {
  const { cameras: registryCameras, loading: camerasLoading, error: cameraRegistryError, createCamera, updateCamera, deleteCamera } = useCameraRegistry();
  const [selectedCameraId, setSelectedCameraId] = useState('webcam-0');
  const [inspectorOpen, setInspectorOpen] = useState(true);
  const [fullscreenCameraId, setFullscreenCameraId] = useState<string | null>(null);
  const [cameraPanel, setCameraPanel] = useState<CameraPanelState | null>(null);
  const [cameraMutationError, setCameraMutationError] = useState<string | null>(null);
  const [gridMode, setGridMode] = useState<GridMode>('auto');
  const [gridMenuOpen, setGridMenuOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [showFrameAiInfo, setShowFrameAiInfo] = useState(true);
  const primaryStream = useRealtimeStream();
  const selectedRegistryCamera = useMemo(() => registryCameras.find((camera) => camera.id === selectedCameraId) ?? null, [registryCameras, selectedCameraId]);
  const selectedRegistryStreamUrl = useMemo(() => (selectedRegistryCamera ? buildCameraStreamUrl(selectedRegistryCamera) : ''), [selectedRegistryCamera]);
  const selectedRegistryStreamEnabled = Boolean(selectedRegistryCamera?.enabled && selectedRegistryCamera.streamUrl.trim());
  const selectedRegistryStream = useRealtimeStream(selectedRegistryStreamUrl, selectedRegistryStreamEnabled);

  const cameras = useMemo(() => {
    return [
      createPrimaryCamera(primaryStream.frame, primaryStream.state),
      ...registryCameras.map((camera) =>
        createRegistryCamera(
          camera,
          camera.id === selectedCameraId ? selectedRegistryStream.frame : null,
          camera.id === selectedCameraId ? selectedRegistryStream.state : 'idle'
        )
      )
    ];
  }, [primaryStream.frame, primaryStream.state, registryCameras, selectedCameraId, selectedRegistryStream.frame, selectedRegistryStream.state]);

  const filteredCameras = cameras.filter((cameraItem) => {
    const target = `${cameraItem.name} ${cameraItem.location} ${cameraItem.zone}`.toLowerCase();
    return target.includes(query.trim().toLowerCase());
  });

  const selectedCamera = cameras.find((cameraItem) => cameraItem.id === selectedCameraId) ?? cameras[0];
  const fullscreenCamera = cameras.find((cameraItem) => cameraItem.id === fullscreenCameraId) ?? null;
  const selectedStreamState = selectedCamera.isPrimary ? primaryStream.state : selectedRegistryStream.state;
  const selectedStreamError = selectedCamera.isPrimary ? primaryStream.error : selectedRegistryStream.error;
  const onlineCount = cameras.filter((cameraItem) => cameraItem.status === 'online').length;
  const warningCount = cameras.filter((cameraItem) => cameraItem.status === 'warning').length;
  const offlineCount = cameras.filter((cameraItem) => cameraItem.status === 'offline').length;
  const highRiskCount = cameras.filter((cameraItem) => cameraItem.riskLevel === 'HIGH' || cameraItem.riskLevel === 'CRITICAL').length;
  const gridClass = getGridClass(gridMode, inspectorOpen);

  return (
    <div className="space-y-6">
      <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-orange-600">PhoenixVision Control Center</p>
            <h1 className="mt-1 text-2xl font-semibold text-slate-950">Quản lý camera trực tiếp</h1>
            <p className="mt-1 text-sm text-slate-500">Theo dõi nhiều camera, phân tích cháy khói và cảnh báo rủi ro theo thời gian thực.</p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm transition hover:border-slate-300 hover:bg-slate-50">
              <RefreshCcw size={16} />
              Làm mới
            </button>
            <div className="relative">
              <button
                onClick={() => setGridMenuOpen((value) => !value)}
                className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm transition hover:border-slate-300 hover:bg-slate-50"
              >
                <LayoutGrid size={16} />
                Bố cục lưới
              </button>

              <AnimatePresence>
                {gridMenuOpen ? (
                  <motion.div
                    initial={{ opacity: 0, y: 8, scale: 0.98 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 8, scale: 0.98 }}
                    className="absolute right-0 z-20 mt-2 w-48 overflow-hidden rounded-2xl border border-slate-200 bg-white p-1 shadow-xl"
                  >
                    <GridModeButton label="Tự động" active={gridMode === 'auto'} onClick={() => selectGridMode('auto', setGridMode, setGridMenuOpen)} />
                    <GridModeButton label="2 cột" active={gridMode === 'two'} onClick={() => selectGridMode('two', setGridMode, setGridMenuOpen)} />
                    <GridModeButton label="3 cột" active={gridMode === 'three'} onClick={() => selectGridMode('three', setGridMode, setGridMenuOpen)} />
                  </motion.div>
                ) : null}
              </AnimatePresence>
            </div>
            <button
              onClick={() => {
                setCameraMutationError(null);
                setCameraPanel({ mode: 'create' });
              }}
              className="inline-flex items-center gap-2 rounded-xl bg-orange-600 px-4 py-2 text-sm font-semibold text-white shadow-sm shadow-orange-600/20 transition hover:bg-orange-700"
            >
              <Plus size={16} />
              Thêm camera
            </button>
          </div>
        </div>

      </section>

      <section className={`grid gap-5 ${inspectorOpen ? 'xl:grid-cols-[minmax(0,1fr)_360px]' : ''}`}>
        <div className="space-y-4">
          <div className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm lg:flex-row lg:items-center lg:justify-between">
            <div className="relative flex-1">
              <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={17} />
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Tìm theo tên camera, khu vực hoặc tầng..."
                className="h-11 w-full rounded-xl border border-slate-200 bg-slate-50 pl-10 pr-4 text-sm outline-none transition placeholder:text-slate-400 focus:border-orange-300 focus:bg-white focus:ring-4 focus:ring-orange-100"
              />
            </div>
            <button className="inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 transition hover:bg-slate-50">
              <SlidersHorizontal size={16} />
              Bộ lọc
            </button>
          </div>
          {cameraRegistryError ? (
            <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              Firestore chưa sẵn sàng hoặc rules chưa cho phép đọc ghi: {cameraRegistryError}
            </div>
          ) : null}
          {camerasLoading ? (
            <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-500">Đang tải danh sách camera từ Firestore...</div>
          ) : null}

          <div className={`grid gap-4 ${gridClass}`}>
            {filteredCameras.map((cameraItem) => (
              <CameraGridCard
                key={cameraItem.id}
                cameraItem={cameraItem}
                active={cameraItem.id === selectedCamera.id}
                onSelect={() => {
                  setSelectedCameraId(cameraItem.id);
                  setInspectorOpen(true);
                }}
                onFullscreen={() => setFullscreenCameraId(cameraItem.id)}
                showAiInfo={showFrameAiInfo}
                onToggleAiInfo={() => setShowFrameAiInfo((value) => !value)}
                onEdit={() => {
                  setCameraMutationError(null);
                  setCameraPanel({ mode: 'edit', camera: cameraItem });
                }}
              />
            ))}
          </div>
        </div>

        {inspectorOpen ? (
          <CameraInspector
            cameraItem={selectedCamera}
            streamState={selectedStreamState}
            streamError={selectedStreamError}
            onClose={() => setInspectorOpen(false)}
            onEdit={() => {
              setCameraMutationError(null);
              setCameraPanel({ mode: 'edit', camera: selectedCamera });
            }}
            onDelete={() => handleDeleteCamera(selectedCamera)}
          />
        ) : null}
      </section>

      <div className="flex items-center gap-4 px-1 text-sm text-slate-500">
        <span className="h-px flex-1 bg-slate-300" />
        <div className="flex flex-wrap items-center justify-center gap-x-5 gap-y-2">
          <span>
            Tổng camera: <strong className="font-semibold text-slate-950">{cameras.length}</strong>
          </span>
          <span>
            Đang hoạt động: <strong className="font-semibold text-emerald-700">{onlineCount}</strong>
          </span>
          <span>
            Cần chú ý: <strong className="font-semibold text-amber-700">{warningCount + highRiskCount}</strong>
          </span>
          <span>
            Mất kết nối: <strong className="font-semibold text-slate-700">{offlineCount}</strong>
          </span>
        </div>
        <span className="h-px flex-1 bg-slate-300" />
      </div>

      <AnimatePresence>
        {fullscreenCamera ? <FullscreenCamera cameraItem={fullscreenCamera} showAiInfo={showFrameAiInfo} onToggleAiInfo={() => setShowFrameAiInfo((value) => !value)} onClose={() => setFullscreenCameraId(null)} /> : null}
        {cameraPanel ? (
          <CameraFormPanel
            panelState={cameraPanel}
            error={cameraMutationError}
            onClose={() => setCameraPanel(null)}
            onSubmit={handleSaveCamera}
          />
        ) : null}
      </AnimatePresence>
    </div>
  );

  async function handleSaveCamera(input: CameraRegistryInput) {
    try {
      setCameraMutationError(null);
      if (cameraPanel?.mode === 'edit') {
        await updateCamera(cameraPanel.camera.id, input);
      } else {
        await createCamera(input);
      }
      setCameraPanel(null);
    } catch (saveError) {
      setCameraMutationError(saveError instanceof Error ? saveError.message : 'Không thể lưu camera.');
    }
  }

  async function handleDeleteCamera(cameraItem: CameraItem) {
    if (cameraItem.isPrimary) {
      setCameraMutationError('Không thể xóa webcam local mặc định.');
      return;
    }

    if (!window.confirm(`Xóa camera "${cameraItem.name}" khỏi tài khoản này?`)) {
      return;
    }

    try {
      setCameraMutationError(null);
      await deleteCamera(cameraItem.id);
      setSelectedCameraId('webcam-0');
      setInspectorOpen(true);
    } catch (deleteError) {
      setCameraMutationError(deleteError instanceof Error ? deleteError.message : 'Không thể xóa camera.');
    }
  }
}

function createPrimaryCamera(frame: ProcessedFrameMessage | null, state: string): CameraItem {
  const risk = frame?.risk;
  const status: CameraStatus = state === 'connected' ? 'online' : state === 'error' ? 'offline' : 'warning';
  const detections = frame?.detections ?? [];

  return {
    id: frame?.cameraId ?? 'webcam-0',
    name: 'Webcam local',
    location: 'Máy hiện tại',
    zone: 'Nguồn kiểm thử',
    source: 'webcam',
    status,
    riskLevel: risk?.riskLevel ?? 'LOW',
    riskScore: risk?.riskScore ?? 0,
    fps: frame?.fps ?? 0,
    lastSeen: frame ? 'Vừa xong' : 'Đang chờ frame',
    fire: detections.filter((item) => item.label === 'fire').length,
    smoke: detections.filter((item) => item.label === 'smoke').length,
    streamUrl: '',
    enabled: true,
    isPrimary: true,
    frame
  };
}

function createRegistryCamera(camera: CameraRegistryItem, frame: ProcessedFrameMessage | null, streamState: string): CameraItem {
  const defaults = cameraRuntimeDefaults[camera.id] ?? {};
  const hasStreamUrl = Boolean(camera.streamUrl.trim());
  const risk = frame?.risk;
  const detections = frame?.detections ?? [];
  const activeStatus: CameraStatus = streamState === 'connected' ? 'online' : streamState === 'error' ? 'offline' : 'warning';
  const configuredStatus = hasStreamUrl ? ((defaults.status as CameraStatus | undefined) ?? 'online') : 'warning';

  return {
    id: camera.id,
    name: camera.name,
    location: camera.location,
    zone: camera.zone,
    source: camera.source,
    status: camera.enabled ? (frame || streamState !== 'idle' ? activeStatus : configuredStatus) : 'offline',
    riskLevel: risk?.riskLevel ?? ((defaults.riskLevel as RiskLevel | undefined) ?? 'LOW'),
    riskScore: risk?.riskScore ?? (hasStreamUrl ? defaults.riskScore ?? 0 : 0),
    fps: camera.enabled ? frame?.fps ?? (hasStreamUrl ? defaults.fps ?? 0 : 0) : 0,
    lastSeen: camera.enabled ? (frame ? 'Vừa xong' : hasStreamUrl ? defaults.lastSeen ?? 'Đã cấu hình' : 'Chưa có stream URL') : 'Đã tắt',
    fire: frame ? detections.filter((item) => item.label === 'fire').length : hasStreamUrl ? defaults.fire ?? 0 : 0,
    smoke: frame ? detections.filter((item) => item.label === 'smoke').length : hasStreamUrl ? defaults.smoke ?? 0 : 0,
    streamUrl: camera.streamUrl,
    enabled: camera.enabled,
    frame
  };
}

function getGridClass(gridMode: GridMode, inspectorOpen: boolean) {
  if (gridMode === 'two') {
    return 'lg:grid-cols-2';
  }
  if (gridMode === 'three') {
    return 'lg:grid-cols-2 xl:grid-cols-3';
  }
  return inspectorOpen ? 'lg:grid-cols-2' : 'lg:grid-cols-2 xl:grid-cols-3';
}

function selectGridMode(
  mode: GridMode,
  setGridMode: (mode: GridMode) => void,
  setGridMenuOpen: (open: boolean) => void
) {
  setGridMode(mode);
  setGridMenuOpen(false);
}

function GridModeButton({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={`flex w-full items-center justify-between rounded-xl px-3 py-2 text-left text-sm font-semibold transition ${
        active ? 'bg-orange-50 text-orange-700' : 'text-slate-600 hover:bg-slate-50'
      }`}
    >
      {label}
      {active ? <span className="h-2 w-2 rounded-full bg-orange-600" /> : null}
    </button>
  );
}

function CameraGridCard({
  cameraItem,
  active,
  onSelect,
  onFullscreen,
  showAiInfo,
  onToggleAiInfo,
  onEdit
}: {
  cameraItem: CameraItem;
  active: boolean;
  onSelect: () => void;
  onFullscreen: () => void;
  showAiInfo: boolean;
  onToggleAiInfo: () => void;
  onEdit: () => void;
}) {
  const imageSrc = cameraItem.frame ? `data:image/jpeg;base64,${cameraItem.frame.frame}` : null;

  return (
    <motion.article
      layout
      onClick={onSelect}
      className={`group overflow-hidden rounded-2xl border bg-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-md ${
        active ? 'border-orange-300 ring-4 ring-orange-100' : 'border-slate-200'
      }`}
    >
      <div className="relative aspect-video bg-slate-950">
        {imageSrc ? (
          <img src={imageSrc} alt={`${cameraItem.name} realtime feed`} className="h-full w-full object-cover" />
        ) : (
          <CameraPlaceholder cameraItem={cameraItem} />
        )}

        {imageSrc && showAiInfo ? <FrameAiInfo cameraItem={cameraItem} compact /> : null}

        <div className="absolute right-3 top-3 flex items-center gap-2 opacity-100 transition lg:opacity-0 lg:group-hover:opacity-100">
          <button
            type="button"
            onClick={(event) => {
              event.stopPropagation();
              onToggleAiInfo();
            }}
            className="grid h-9 w-9 place-items-center rounded-full border border-white/20 bg-black/40 text-white backdrop-blur transition hover:bg-black/60"
            aria-label={showAiInfo ? 'Ẩn thông tin AI trên khung hình' : 'Hiện thông tin AI trên khung hình'}
            title={showAiInfo ? 'Ẩn thông tin AI' : 'Hiện thông tin AI'}
          >
            {showAiInfo ? <EyeOff size={16} /> : <Eye size={16} />}
          </button>
          <button
            type="button"
            onClick={(event) => {
              event.stopPropagation();
              onFullscreen();
            }}
            className="grid h-9 w-9 place-items-center rounded-full border border-white/20 bg-black/40 text-white backdrop-blur transition hover:bg-black/60"
            aria-label="Xem toàn màn hình"
          >
            <Maximize2 size={16} />
          </button>
          {!cameraItem.isPrimary ? (
            <button
              type="button"
              onClick={(event) => {
                event.stopPropagation();
                onEdit();
              }}
              className="grid h-9 w-9 place-items-center rounded-full border border-white/20 bg-black/40 text-white backdrop-blur transition hover:bg-black/60"
              aria-label="Sửa camera"
            >
              <Edit3 size={16} />
            </button>
          ) : null}
        </div>

      </div>

      <div className="flex items-center justify-between gap-3 border-t border-slate-100 px-4 py-3">
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-slate-900">{cameraItem.name}</p>
          <p className="mt-0.5 flex items-center gap-1 text-xs text-slate-500">
            <MapPin size={12} />
            <span className="truncate">{cameraItem.location}</span>
            <span className="text-slate-300">/</span>
            <span>{cameraItem.source.toUpperCase()}</span>
          </p>
        </div>
      </div>

      <div className="grid grid-cols-4 divide-x divide-slate-100 border-t border-slate-100">
        <CameraMetric label="Risk" value={cameraItem.riskScore.toFixed(0)} />
        <CameraMetric label="FPS" value={cameraItem.fps ? cameraItem.fps.toFixed(1) : '--'} />
        <CameraMetric label="Fire" value={String(cameraItem.fire)} />
        <CameraMetric label="Smoke" value={String(cameraItem.smoke)} />
      </div>
    </motion.article>
  );
}

function CameraPlaceholder({ cameraItem }: { cameraItem: CameraItem }) {
  const offline = cameraItem.status === 'offline';

  return (
    <div className={`grid h-full place-items-center ${offline ? 'bg-slate-900' : 'bg-gradient-to-br from-slate-900 via-slate-800 to-slate-950'}`}>
      <div className="text-center text-white">
        {offline ? <WifiOff className="mx-auto mb-3 text-slate-500" size={36} /> : <Video className="mx-auto mb-3 text-slate-400" size={36} />}
        <p className="text-sm font-semibold">{offline ? 'Camera mất kết nối' : 'Camera đang chờ cấu hình stream'}</p>
        <p className="mt-1 text-xs text-slate-400">{cameraItem.zone}</p>
      </div>
    </div>
  );
}

function FrameAiInfo({ cameraItem, compact = false }: { cameraItem: CameraItem; compact?: boolean }) {
  const risk = cameraItem.frame?.risk;

  return (
    <div className={`pointer-events-none absolute left-3 top-3 max-w-[min(360px,calc(100%-96px))] rounded-xl border border-white/15 bg-slate-950/70 text-white shadow-lg backdrop-blur ${compact ? 'px-3 py-2' : 'px-4 py-3'}`}>
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-xs font-semibold uppercase tracking-[0.12em] text-white/55">AI</span>
        <span className="text-sm font-semibold">{cameraItem.riskLevel}</span>
        <span className="text-sm text-white/70">{cameraItem.riskScore.toFixed(0)}/100</span>
      </div>
      <p className="mt-1 truncate text-xs text-white/75">{risk?.status ?? 'Monitoring'}</p>
      {!compact ? (
        <div className="mt-2 grid grid-cols-4 gap-2 text-xs text-white/70">
          <span>FPS {cameraItem.fps ? cameraItem.fps.toFixed(1) : '--'}</span>
          <span>Fire {cameraItem.fire}</span>
          <span>Smoke {cameraItem.smoke}</span>
          <span>Cons {Math.round((risk?.frameConsistency ?? 0) * 100)}%</span>
        </div>
      ) : null}
    </div>
  );
}

function CameraInspector({
  cameraItem,
  streamState,
  streamError,
  onClose,
  onEdit,
  onDelete
}: {
  cameraItem: CameraItem;
  streamState: string;
  streamError: string | null;
  onClose: () => void;
  onEdit: () => void;
  onDelete: () => void;
}) {
  return (
    <aside className="h-fit rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">Camera đang chọn</p>
          <h2 className="mt-1 text-xl font-semibold text-slate-950">{cameraItem.name}</h2>
          <p className="mt-1 text-sm text-slate-500">{cameraItem.zone}</p>
        </div>
        <button onClick={onClose} className="grid h-10 w-10 place-items-center rounded-xl border border-slate-200 text-slate-600 transition hover:bg-slate-50" aria-label="Đóng bảng camera đang chọn">
          <X size={17} />
        </button>
      </div>

      <div className="mt-5 rounded-2xl border border-slate-200 bg-slate-50 p-4">
        <div className="flex items-center justify-between">
          <span className={`rounded-full border px-3 py-1 text-xs font-semibold ${riskTone[cameraItem.riskLevel]}`}>{cameraItem.riskLevel}</span>
          <span className="text-3xl font-semibold text-slate-950">{cameraItem.riskScore.toFixed(0)}</span>
        </div>
        <div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-200">
          <div className="h-full rounded-full bg-gradient-to-r from-emerald-500 via-amber-500 to-red-600" style={{ width: `${Math.max(4, Math.min(100, cameraItem.riskScore))}%` }} />
        </div>
        <p className="mt-3 text-sm text-slate-600">{cameraItem.fire || cameraItem.smoke ? 'Có dấu hiệu lửa/khói, cần kiểm tra camera ngay.' : 'Chưa ghi nhận dấu hiệu lửa hoặc khói.'}</p>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-3">
        <DetailMetric icon={Activity} label="FPS" value={cameraItem.fps ? cameraItem.fps.toFixed(1) : '--'} />
        <DetailMetric icon={Clock3} label="Cập nhật" value={cameraItem.lastSeen} />
        <DetailMetric icon={DoorOpen} label="Khu vực" value={cameraItem.location} />
        <DetailMetric icon={AlertTriangle} label="Fire/Smoke" value={`${cameraItem.fire}/${cameraItem.smoke}`} />
      </div>

      <div className="mt-4 rounded-2xl border border-slate-200 p-4">
        <p className="text-sm font-semibold text-slate-900">Trạng thái kết nối</p>
        <div className="mt-3 flex items-center gap-2">
          {cameraItem.status === 'offline' ? <WifiOff size={17} className="text-slate-500" /> : <Wifi size={17} className="text-emerald-600" />}
          <span className="text-sm font-medium text-slate-700">{statusLabel[cameraItem.status]}</span>
        </div>
        {cameraItem.isPrimary ? (
          <p className="mt-2 text-xs leading-5 text-slate-500">{streamError ?? `WebSocket hiện tại: ${streamState}. Camera local là nguồn stream thật từ AI service.`}</p>
        ) : cameraItem.streamUrl ? (
          <p className="mt-2 text-xs leading-5 text-slate-500">
            {streamError ?? `Stream đã cấu hình. Khi chọn camera này, AI service mở nguồn ${cameraItem.source.toUpperCase()} và trả frame theo thời gian thực.`}
          </p>
        ) : (
          <p className="mt-2 text-xs leading-5 text-slate-500">Chưa có URL stream. Bấm Cấu hình rồi nhập RTSP/IP URL thật để AI service bắt đầu nhận diện.</p>
        )}
      </div>

      <div className="mt-4 grid grid-cols-2 gap-3">
        <button
          onClick={onEdit}
          disabled={cameraItem.isPrimary}
          className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
        >
          <Edit3 size={16} />
          Cấu hình
        </button>
        <button
          onClick={onDelete}
          disabled={cameraItem.isPrimary}
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-red-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-red-700 disabled:cursor-not-allowed disabled:bg-slate-300"
        >
          <Trash2 size={16} />
          Xóa camera
        </button>
      </div>
    </aside>
  );
}

function FullscreenCamera({
  cameraItem,
  showAiInfo,
  onToggleAiInfo,
  onClose
}: {
  cameraItem: CameraItem;
  showAiInfo: boolean;
  onToggleAiInfo: () => void;
  onClose: () => void;
}) {
  const imageSrc = cameraItem.frame ? `data:image/jpeg;base64,${cameraItem.frame.frame}` : null;
  const detections = cameraItem.frame?.detections ?? [];
  const risk = cameraItem.frame?.risk;
  const [incidents, setIncidents] = useState<IncidentTimelineEvent[]>([]);
  const [incidentError, setIncidentError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    async function loadIncidents() {
      try {
        const data = await getIncidentTimeline({ cameraId: cameraItem.id });
        if (isMounted) {
          setIncidents(data.slice(0, 4));
          setIncidentError(null);
        }
      } catch {
        if (isMounted) {
          setIncidentError('Không tải được incident gần nhất.');
        }
      }
    }

    loadIncidents();
    const intervalId = window.setInterval(loadIncidents, 5000);
    return () => {
      isMounted = false;
      window.clearInterval(intervalId);
    };
  }, [cameraItem.id]);

  return (
    <motion.div className="fixed inset-0 z-50 bg-slate-950/85 p-4 backdrop-blur-sm" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
      <motion.div className="mx-auto flex h-full max-w-7xl flex-col overflow-hidden rounded-3xl bg-white shadow-2xl" initial={{ scale: 0.96, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.96, y: 20 }}>
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 px-5 py-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-orange-600">Camera detail view</p>
            <h3 className="mt-1 text-xl font-semibold text-slate-950">{cameraItem.name}</h3>
            <p className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-slate-500">
              <span>{cameraItem.zone}</span>
              <span className="hidden h-1 w-1 rounded-full bg-slate-300 sm:inline-block" />
              <span>{cameraItem.location}</span>
              <span className="hidden h-1 w-1 rounded-full bg-slate-300 sm:inline-block" />
              <span>{cameraItem.source.toUpperCase()}</span>
            </p>
          </div>
          <div className="flex items-center gap-2">
            <StatusBadge status={cameraItem.status} />
            <span className={`rounded-full border px-3 py-1 text-xs font-semibold ${riskTone[cameraItem.riskLevel]}`}>{cameraItem.riskLevel}</span>
            <button
              onClick={onToggleAiInfo}
              className="inline-flex h-10 items-center gap-2 rounded-xl border border-slate-200 px-3 text-sm font-semibold text-slate-600 transition hover:bg-slate-50"
              aria-label={showAiInfo ? 'Ẩn thông tin AI trên khung hình' : 'Hiện thông tin AI trên khung hình'}
            >
              {showAiInfo ? <EyeOff size={16} /> : <Eye size={16} />}
              {showAiInfo ? 'Ẩn AI' : 'Hiện AI'}
            </button>
            <button onClick={onClose} className="grid h-10 w-10 place-items-center rounded-xl border border-slate-200 text-slate-600 transition hover:bg-slate-50" aria-label="Đóng">
              <X size={18} />
            </button>
          </div>
        </div>

        <div className="grid min-h-0 flex-1 bg-slate-100 lg:grid-cols-[minmax(0,1fr)_360px]">
          <div className="flex min-h-0 flex-col bg-slate-950">
            <div className="relative min-h-0 flex-1">
              {imageSrc ? <img src={imageSrc} alt={`${cameraItem.name} fullscreen feed`} className="h-full w-full object-contain" /> : <CameraPlaceholder cameraItem={cameraItem} />}
              {imageSrc && showAiInfo ? <FrameAiInfo cameraItem={cameraItem} /> : null}
            </div>

            <div className="grid border-t border-white/10 bg-slate-900/95 text-white sm:grid-cols-4">
              <FullscreenMetric label="FPS" value={cameraItem.fps ? cameraItem.fps.toFixed(1) : '--'} />
              <FullscreenMetric label="Risk" value={cameraItem.riskScore.toFixed(0)} />
              <FullscreenMetric label="Fire" value={String(cameraItem.fire)} />
              <FullscreenMetric label="Smoke" value={String(cameraItem.smoke)} />
            </div>
          </div>

          <aside className="min-h-0 overflow-y-auto border-t border-slate-200 bg-white p-5 lg:border-l lg:border-t-0">
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">Risk analysis</p>
                  <p className="mt-1 text-2xl font-semibold text-slate-950">{cameraItem.riskScore.toFixed(0)}</p>
                </div>
                <span className={`rounded-full border px-3 py-1 text-xs font-semibold ${riskTone[cameraItem.riskLevel]}`}>{cameraItem.riskLevel}</span>
              </div>
              <p className="mt-3 text-sm font-medium text-slate-700">{risk?.status ?? 'Chưa có phân tích nguy cơ từ frame hiện tại.'}</p>
              <div className="mt-4 grid grid-cols-2 gap-2">
                <DetailMetric icon={Clock3} label="Duration" value={`${risk?.durationSeconds?.toFixed(1) ?? '0.0'}s`} />
                <DetailMetric icon={Activity} label="Consistency" value={`${Math.round((risk?.frameConsistency ?? 0) * 100)}%`} />
                <DetailMetric icon={DoorOpen} label="People" value={String(risk?.humansDetectedCount ?? 0)} />
                <DetailMetric icon={AlertTriangle} label="Nearby" value={String(risk?.humansNearbyCount ?? 0)} />
              </div>
            </div>

            <div className="mt-4 rounded-2xl border border-slate-200 p-4">
              <div className="mb-3 flex items-center justify-between">
                <p className="text-sm font-semibold text-slate-900">Detections</p>
                <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-600">{detections.length}</span>
              </div>
              <div className="space-y-2">
                {detections.length ? (
                  detections.map((item, index) => <DetectionRow key={`${item.label}-${index}`} label={item.label} confidence={item.confidence} boxes={item.boxes.length} />)
                ) : (
                  <p className="rounded-xl bg-slate-50 px-3 py-3 text-sm text-slate-500">Frame hiện tại chưa có object fire/smoke/person.</p>
                )}
              </div>
            </div>

            <div className="mt-4 rounded-2xl border border-slate-200 p-4">
              <div className="mb-3 flex items-center justify-between">
                <p className="text-sm font-semibold text-slate-900">Incident gần nhất</p>
                <Flame size={17} className="text-orange-600" />
              </div>
              {incidentError ? <p className="rounded-xl bg-red-50 px-3 py-2 text-sm text-red-700">{incidentError}</p> : null}
              <div className="space-y-3">
                {incidents.length ? incidents.map((incident) => <RecentIncident key={incident.id} incident={incident} />) : <p className="rounded-xl bg-slate-50 px-3 py-3 text-sm text-slate-500">Chưa có incident nào cho camera này.</p>}
              </div>
            </div>
          </aside>
        </div>
      </motion.div>
    </motion.div>
  );
}

function FullscreenMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="border-b border-white/10 px-4 py-3 sm:border-b-0 sm:border-r last:sm:border-r-0">
      <p className="text-xs text-white/50">{label}</p>
      <p className="mt-1 text-lg font-semibold">{value}</p>
    </div>
  );
}

function DetectionRow({ label, confidence, boxes }: { label: string; confidence: number; boxes: number }) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-xl bg-slate-50 px-3 py-2">
      <div>
        <p className="text-sm font-semibold capitalize text-slate-800">{label}</p>
        <p className="text-xs text-slate-500">{boxes} box</p>
      </div>
      <span className="rounded-full bg-white px-2.5 py-1 text-xs font-semibold text-slate-700 ring-1 ring-slate-200">{Math.round(confidence * 100)}%</span>
    </div>
  );
}

function RecentIncident({ incident }: { incident: IncidentTimelineEvent }) {
  return (
    <article className="rounded-xl border border-slate-200 p-3">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-slate-900">{incident.title}</p>
          <p className="mt-1 line-clamp-2 text-xs leading-5 text-slate-500">{incident.description}</p>
        </div>
        <span className={`shrink-0 rounded-full border px-2 py-0.5 text-[11px] font-semibold ${riskTone[incident.riskLevel]}`}>{incident.riskLevel}</span>
      </div>
      <p className="mt-2 text-xs text-slate-400">{new Date(incident.createdAt).toLocaleString()}</p>
    </article>
  );
}

function CameraFormPanel({
  panelState,
  error,
  onClose,
  onSubmit
}: {
  panelState: CameraPanelState;
  error: string | null;
  onClose: () => void;
  onSubmit: (input: CameraRegistryInput) => Promise<void>;
}) {
  const initialInput = panelState.mode === 'edit' ? getCameraFormInput(panelState.camera) : getEmptyCameraInput();
  const [name, setName] = useState(initialInput.name);
  const [location, setLocation] = useState(initialInput.location);
  const [zone, setZone] = useState(initialInput.zone);
  const [streamUrl, setStreamUrl] = useState(initialInput.streamUrl);
  const [source, setSource] = useState<CameraSource>(initialInput.source);
  const [enabled, setEnabled] = useState(initialInput.enabled);
  const [submitting, setSubmitting] = useState(false);
  const isEdit = panelState.mode === 'edit';

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    try {
      await onSubmit({
        name: name.trim(),
        location: location.trim(),
        zone: zone.trim(),
        streamUrl: streamUrl.trim(),
        source,
        enabled
      });
    } finally {
      setSubmitting(false);
    }
  }

  return createPortal(
    <motion.div className="fixed inset-0 z-[100] bg-slate-950/55 backdrop-blur-md" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
      <motion.aside
        className="relative z-[101] ml-auto h-full w-full max-w-md overflow-y-auto bg-white p-6 shadow-2xl"
        initial={{ x: '100%' }}
        animate={{ x: 0 }}
        exit={{ x: '100%' }}
        transition={{ type: 'spring', stiffness: 260, damping: 28 }}
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-orange-600">Camera source</p>
            <h2 className="mt-1 text-xl font-semibold text-slate-950">{isEdit ? 'Cập nhật camera' : 'Thêm camera mới'}</h2>
            <p className="mt-1 text-sm text-slate-500">Cấu hình được lưu riêng trong tài khoản Firebase hiện tại.</p>
          </div>
          <button onClick={onClose} className="grid h-10 w-10 place-items-center rounded-xl border border-slate-200 text-slate-600 transition hover:bg-slate-50" aria-label="Đóng">
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          <FormField label="Tên camera" value={name} onChange={setName} placeholder="Ví dụ: Hành lang tầng 4" required />
          <FormField label="Khu vực" value={location} onChange={setLocation} placeholder="Ví dụ: Tầng 4" required />
          <FormField label="Nhóm vị trí" value={zone} onChange={setZone} placeholder="Ví dụ: Tòa A" required />
          <FormField
            label={source === 'webcam' ? 'Webcam index' : 'RTSP hoặc IP stream URL'}
            value={streamUrl}
            onChange={setStreamUrl}
            placeholder={source === 'webcam' ? '0 hoặc 1' : 'rtsp://username:password@camera-ip:554/stream'}
            required={source !== 'webcam'}
          />
          <label className="block">
            <span className="text-sm font-semibold text-slate-700">Loại nguồn</span>
            <select
              value={source}
              onChange={(event) => setSource(event.target.value as CameraSource)}
              className="mt-2 h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none focus:border-orange-300 focus:ring-4 focus:ring-orange-100"
            >
              <option value="rtsp">RTSP camera</option>
              <option value="ip">IP camera</option>
              <option value="webcam">Webcam local</option>
            </select>
          </label>

          <label className="flex items-center justify-between rounded-2xl border border-slate-200 px-4 py-3">
            <span>
              <span className="block text-sm font-semibold text-slate-700">Bật camera</span>
              <span className="block text-xs text-slate-500">Camera tắt sẽ được tính là mất kết nối.</span>
            </span>
            <input
              type="checkbox"
              checked={enabled}
              onChange={(event) => setEnabled(event.target.checked)}
              className="h-5 w-5 rounded border-slate-300 text-orange-600 focus:ring-orange-500"
            />
          </label>

          {error ? <div className="rounded-2xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</div> : null}

          <button
            type="submit"
            disabled={submitting || !name.trim() || !location.trim() || !zone.trim() || (source !== 'webcam' && !streamUrl.trim())}
            className="w-full rounded-xl bg-orange-600 px-4 py-3 text-sm font-semibold text-white shadow-sm shadow-orange-600/20 transition hover:bg-orange-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {submitting ? 'Đang lưu...' : isEdit ? 'Cập nhật camera' : 'Lưu camera'}
          </button>
        </form>
      </motion.aside>
    </motion.div>,
    document.body
  );
}

function getEmptyCameraInput(): CameraRegistryInput {
  return {
    name: '',
    location: '',
    zone: '',
    source: 'rtsp',
    streamUrl: '',
    enabled: true
  };
}

function getCameraFormInput(cameraItem: CameraItem): CameraRegistryInput {
  return {
    name: cameraItem.name,
    location: cameraItem.location,
    zone: cameraItem.zone,
    source: cameraItem.source,
    streamUrl: cameraItem.streamUrl ?? '',
    enabled: cameraItem.enabled ?? cameraItem.status !== 'offline'
  };
}

function FormField({
  label,
  value,
  onChange,
  placeholder,
  required = false
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  required?: boolean;
}) {
  return (
    <label className="block">
      <span className="text-sm font-semibold text-slate-700">{label}</span>
      <input
        value={value}
        onChange={(event) => onChange(event.target.value)}
        required={required}
        className="mt-2 h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none transition placeholder:text-slate-400 focus:border-orange-300 focus:ring-4 focus:ring-orange-100"
        placeholder={placeholder}
      />
    </label>
  );
}

function StatusBadge({ status }: { status: CameraStatus }) {
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-semibold ${statusTone[status]}`}>
      <span className={`h-1.5 w-1.5 rounded-full ${status === 'online' ? 'bg-emerald-500' : status === 'warning' ? 'bg-amber-500' : 'bg-slate-400'}`} />
      {statusLabel[status]}
    </span>
  );
}

function CameraMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="p-3 text-center">
      <p className="text-xs text-slate-400">{label}</p>
      <p className="mt-1 text-sm font-semibold text-slate-900">{value}</p>
    </div>
  );
}

function DetailMetric({ icon: Icon, label, value }: { icon: typeof Activity; label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3">
      <Icon className="mb-2 text-slate-500" size={17} />
      <p className="text-xs text-slate-400">{label}</p>
      <p className="mt-1 text-sm font-semibold text-slate-900">{value}</p>
    </div>
  );
}
