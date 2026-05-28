import { AnimatePresence, motion } from 'framer-motion';
import {
  Activity,
  AlertTriangle,
  Camera,
  CheckCircle2,
  Clock3,
  DoorOpen,
  LayoutGrid,
  MapPin,
  Maximize2,
  MoreVertical,
  Plus,
  RefreshCcw,
  Search,
  Settings,
  ShieldAlert,
  SlidersHorizontal,
  Video,
  Wifi,
  WifiOff,
  X
} from 'lucide-react';
import { useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { CameraOverlay, EmergencyOverlay } from '../../components/effects/CinematicEffects';
import { useRealtimeStream } from '../../hooks/useRealtimeStream';
import type { ProcessedFrameMessage, RealtimeRiskPayload } from '../../types/detection';

type CameraStatus = 'online' | 'warning' | 'offline';
type CameraSource = 'webcam' | 'rtsp' | 'ip';
type RiskLevel = RealtimeRiskPayload['riskLevel'];

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
  people: number;
  atRisk: number;
  fire: number;
  smoke: number;
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

const demoCameras: CameraItem[] = [
  {
    id: 'cam-lobby-a01',
    name: 'Sảnh A01',
    location: 'Tầng trệt',
    zone: 'Khu dân cư A',
    source: 'ip',
    status: 'online',
    riskLevel: 'LOW',
    riskScore: 8,
    fps: 15,
    lastSeen: 'Vừa xong',
    people: 4,
    atRisk: 0,
    fire: 0,
    smoke: 0
  },
  {
    id: 'cam-corridor-02',
    name: 'Hành lang tầng 2',
    location: 'Tầng 2',
    zone: 'Khu dân cư A',
    source: 'rtsp',
    status: 'warning',
    riskLevel: 'MEDIUM',
    riskScore: 42,
    fps: 12,
    lastSeen: '12 giây trước',
    people: 2,
    atRisk: 0,
    fire: 0,
    smoke: 1
  },
  {
    id: 'cam-parking-b1',
    name: 'Bãi xe B1',
    location: 'Tầng hầm',
    zone: 'Khu kỹ thuật',
    source: 'rtsp',
    status: 'online',
    riskLevel: 'LOW',
    riskScore: 12,
    fps: 14,
    lastSeen: 'Vừa xong',
    people: 1,
    atRisk: 0,
    fire: 0,
    smoke: 0
  },
  {
    id: 'cam-stairs-03',
    name: 'Cầu thang bộ',
    location: 'Tầng 3',
    zone: 'Lối thoát hiểm',
    source: 'ip',
    status: 'offline',
    riskLevel: 'LOW',
    riskScore: 0,
    fps: 0,
    lastSeen: '4 phút trước',
    people: 0,
    atRisk: 0,
    fire: 0,
    smoke: 0
  }
];

export function LiveDetectionPage() {
  const { frame, state, error } = useRealtimeStream();
  const [selectedCameraId, setSelectedCameraId] = useState('webcam-0');
  const [inspectorOpen, setInspectorOpen] = useState(true);
  const [fullscreenCameraId, setFullscreenCameraId] = useState<string | null>(null);
  const [addCameraOpen, setAddCameraOpen] = useState(false);
  const [query, setQuery] = useState('');

  const cameras = useMemo(() => {
    return [createPrimaryCamera(frame, state), ...demoCameras];
  }, [frame, state]);

  const filteredCameras = cameras.filter((cameraItem) => {
    const target = `${cameraItem.name} ${cameraItem.location} ${cameraItem.zone}`.toLowerCase();
    return target.includes(query.trim().toLowerCase());
  });

  const selectedCamera = cameras.find((cameraItem) => cameraItem.id === selectedCameraId) ?? cameras[0];
  const fullscreenCamera = cameras.find((cameraItem) => cameraItem.id === fullscreenCameraId) ?? null;
  const onlineCount = cameras.filter((cameraItem) => cameraItem.status === 'online').length;
  const warningCount = cameras.filter((cameraItem) => cameraItem.status === 'warning').length;
  const offlineCount = cameras.filter((cameraItem) => cameraItem.status === 'offline').length;
  const highRiskCount = cameras.filter((cameraItem) => cameraItem.riskLevel === 'HIGH' || cameraItem.riskLevel === 'CRITICAL').length;

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
            <button className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm transition hover:border-slate-300 hover:bg-slate-50">
              <LayoutGrid size={16} />
              Bố cục lưới
            </button>
            <button
              onClick={() => setAddCameraOpen(true)}
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

          <div className={`grid gap-4 ${inspectorOpen ? 'lg:grid-cols-2' : 'lg:grid-cols-2 xl:grid-cols-3'}`}>
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
              />
            ))}
          </div>
        </div>

        {inspectorOpen ? <CameraInspector cameraItem={selectedCamera} streamState={state} streamError={error} onClose={() => setInspectorOpen(false)} /> : null}
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
        {fullscreenCamera ? <FullscreenCamera cameraItem={fullscreenCamera} onClose={() => setFullscreenCameraId(null)} /> : null}
        {addCameraOpen ? <AddCameraPanel onClose={() => setAddCameraOpen(false)} /> : null}
      </AnimatePresence>
    </div>
  );
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
    people: risk?.humansDetectedCount ?? detections.filter((item) => item.label === 'person').length,
    atRisk: risk?.humansNearbyCount ?? 0,
    fire: detections.filter((item) => item.label === 'fire').length,
    smoke: detections.filter((item) => item.label === 'smoke').length,
    isPrimary: true,
    frame
  };
}

function CameraGridCard({
  cameraItem,
  active,
  onSelect,
  onFullscreen
}: {
  cameraItem: CameraItem;
  active: boolean;
  onSelect: () => void;
  onFullscreen: () => void;
}) {
  const imageSrc = cameraItem.frame ? `data:image/jpeg;base64,${cameraItem.frame.frame}` : null;
  const danger = cameraItem.riskLevel === 'HIGH' || cameraItem.riskLevel === 'CRITICAL';

  return (
    <motion.article
      layout
      onClick={onSelect}
      className={`group overflow-hidden rounded-2xl border bg-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-md ${
        active ? 'border-orange-300 ring-4 ring-orange-100' : 'border-slate-200'
      }`}
    >
      <div className="relative aspect-video bg-slate-950">
        {danger ? <EmergencyOverlay /> : null}
        {imageSrc ? (
          <img src={imageSrc} alt={`${cameraItem.name} realtime feed`} className="h-full w-full object-cover" />
        ) : (
          <CameraPlaceholder cameraItem={cameraItem} />
        )}

        {imageSrc ? <CameraOverlay danger={danger} /> : null}

        <div className="absolute left-3 top-3 flex flex-wrap items-center gap-2">
          <StatusBadge status={cameraItem.status} />
          <span className={`rounded-full border px-2.5 py-1 text-[11px] font-semibold ${riskTone[cameraItem.riskLevel]}`}>{cameraItem.riskLevel}</span>
        </div>

        <div className="absolute right-3 top-3 flex items-center gap-2 opacity-100 transition lg:opacity-0 lg:group-hover:opacity-100">
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
          <button
            type="button"
            onClick={(event) => event.stopPropagation()}
            className="grid h-9 w-9 place-items-center rounded-full border border-white/20 bg-black/40 text-white backdrop-blur transition hover:bg-black/60"
            aria-label="Tùy chọn camera"
          >
            <MoreVertical size={16} />
          </button>
        </div>

        <div className="absolute bottom-3 left-3 right-3 flex items-end justify-between gap-3">
          <div className="rounded-xl border border-white/15 bg-black/45 px-3 py-2 text-white backdrop-blur">
            <p className="text-sm font-semibold">{cameraItem.name}</p>
            <p className="mt-0.5 flex items-center gap-1 text-xs text-white/75">
              <MapPin size={12} />
              {cameraItem.location}
            </p>
          </div>
          <div className="rounded-xl border border-white/15 bg-black/45 px-3 py-2 text-right text-white backdrop-blur">
            <p className="text-sm font-semibold">{cameraItem.fps ? cameraItem.fps.toFixed(1) : '--'} FPS</p>
            <p className="text-xs text-white/75">{cameraItem.source.toUpperCase()}</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-4 divide-x divide-slate-100 border-t border-slate-100">
        <CameraMetric label="Risk" value={cameraItem.riskScore.toFixed(0)} />
        <CameraMetric label="People" value={String(cameraItem.people)} />
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

function CameraInspector({
  cameraItem,
  streamState,
  streamError,
  onClose
}: {
  cameraItem: CameraItem;
  streamState: string;
  streamError: string | null;
  onClose: () => void;
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
        <p className="mt-3 text-sm text-slate-600">{cameraItem.atRisk > 0 ? 'Có người trong vùng nguy hiểm, cần kiểm tra ngay.' : 'Chưa ghi nhận người trong vùng nguy hiểm.'}</p>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-3">
        <DetailMetric icon={Activity} label="FPS" value={cameraItem.fps ? cameraItem.fps.toFixed(1) : '--'} />
        <DetailMetric icon={Clock3} label="Cập nhật" value={cameraItem.lastSeen} />
        <DetailMetric icon={DoorOpen} label="Khu vực" value={cameraItem.location} />
        <DetailMetric icon={AlertTriangle} label="At Risk" value={String(cameraItem.atRisk)} />
      </div>

      <div className="mt-4 rounded-2xl border border-slate-200 p-4">
        <p className="text-sm font-semibold text-slate-900">Trạng thái kết nối</p>
        <div className="mt-3 flex items-center gap-2">
          {cameraItem.status === 'offline' ? <WifiOff size={17} className="text-slate-500" /> : <Wifi size={17} className="text-emerald-600" />}
          <span className="text-sm font-medium text-slate-700">{statusLabel[cameraItem.status]}</span>
        </div>
        {cameraItem.isPrimary ? (
          <p className="mt-2 text-xs leading-5 text-slate-500">{streamError ?? `WebSocket hiện tại: ${streamState}. Camera local là nguồn stream thật từ AI service.`}</p>
        ) : (
          <p className="mt-2 text-xs leading-5 text-slate-500">Camera mẫu cho giao diện quản lý nhiều luồng. Khi thêm RTSP/IP camera, backend sẽ cấp stream riêng cho từng camera.</p>
        )}
      </div>

      <div className="mt-4 grid grid-cols-2 gap-3">
        <button className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50">
          <Settings size={16} />
          Cấu hình
        </button>
        <button className="inline-flex items-center justify-center gap-2 rounded-xl bg-slate-950 px-4 py-3 text-sm font-semibold text-white transition hover:bg-slate-800">
          <ShieldAlert size={16} />
          Xác minh
        </button>
      </div>
    </aside>
  );
}

function FullscreenCamera({ cameraItem, onClose }: { cameraItem: CameraItem; onClose: () => void }) {
  const imageSrc = cameraItem.frame ? `data:image/jpeg;base64,${cameraItem.frame.frame}` : null;
  const danger = cameraItem.riskLevel === 'HIGH' || cameraItem.riskLevel === 'CRITICAL';

  return (
    <motion.div className="fixed inset-0 z-50 bg-slate-950/80 p-4 backdrop-blur-sm" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
      <motion.div className="mx-auto flex h-full max-w-7xl flex-col overflow-hidden rounded-3xl bg-white shadow-2xl" initial={{ scale: 0.96, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.96, y: 20 }}>
        <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">Xem toàn màn hình</p>
            <h3 className="text-lg font-semibold text-slate-950">{cameraItem.name}</h3>
          </div>
          <button onClick={onClose} className="grid h-10 w-10 place-items-center rounded-xl border border-slate-200 text-slate-600 transition hover:bg-slate-50" aria-label="Đóng">
            <X size={18} />
          </button>
        </div>
        <div className="relative min-h-0 flex-1 bg-slate-950">
          {danger ? <EmergencyOverlay /> : null}
          {imageSrc ? <img src={imageSrc} alt={`${cameraItem.name} fullscreen feed`} className="h-full w-full object-contain" /> : <CameraPlaceholder cameraItem={cameraItem} />}
          {imageSrc ? <CameraOverlay danger={danger} /> : null}
        </div>
      </motion.div>
    </motion.div>
  );
}

function AddCameraPanel({ onClose }: { onClose: () => void }) {
  return createPortal(
    <motion.div className="fixed inset-0 z-[100] bg-slate-950/55 backdrop-blur-md" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
      <motion.aside className="relative z-[101] ml-auto h-full w-full max-w-md overflow-y-auto bg-white p-6 shadow-2xl" initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }} transition={{ type: 'spring', stiffness: 260, damping: 28 }}>
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-orange-600">Camera source</p>
            <h2 className="mt-1 text-xl font-semibold text-slate-950">Thêm camera mới</h2>
            <p className="mt-1 text-sm text-slate-500">Giao diện chuẩn bị cho RTSP, IP camera hoặc webcam local.</p>
          </div>
          <button onClick={onClose} className="grid h-10 w-10 place-items-center rounded-xl border border-slate-200 text-slate-600 transition hover:bg-slate-50" aria-label="Đóng">
            <X size={18} />
          </button>
        </div>

        <div className="mt-6 space-y-4">
          <FormField label="Tên camera" placeholder="Ví dụ: Hành lang tầng 4" />
          <FormField label="Khu vực" placeholder="Ví dụ: Tòa A, tầng 4" />
          <FormField label="RTSP hoặc IP stream URL" placeholder="rtsp://username:password@camera-ip:554/stream" />
          <label className="block">
            <span className="text-sm font-semibold text-slate-700">Loại nguồn</span>
            <select className="mt-2 h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none focus:border-orange-300 focus:ring-4 focus:ring-orange-100">
              <option>RTSP camera</option>
              <option>IP camera</option>
              <option>Webcam local</option>
            </select>
          </label>
        </div>

        <div className="mt-6 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
          Phần này hiện là giao diện quản lý. Khi nối backend camera registry, form sẽ lưu cấu hình camera và tạo stream riêng cho từng nguồn.
        </div>

        <button className="mt-6 w-full rounded-xl bg-orange-600 px-4 py-3 text-sm font-semibold text-white shadow-sm shadow-orange-600/20 transition hover:bg-orange-700">Lưu camera</button>
      </motion.aside>
    </motion.div>,
    document.body
  );
}

function FormField({ label, placeholder }: { label: string; placeholder: string }) {
  return (
    <label className="block">
      <span className="text-sm font-semibold text-slate-700">{label}</span>
      <input className="mt-2 h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none transition placeholder:text-slate-400 focus:border-orange-300 focus:ring-4 focus:ring-orange-100" placeholder={placeholder} />
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
