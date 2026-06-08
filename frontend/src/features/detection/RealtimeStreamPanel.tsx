import { motion } from 'framer-motion';
import { Activity, AlertTriangle, Camera, CircleOff, Radio, RefreshCcw, ShieldCheck } from 'lucide-react';
import { CameraOverlay, DangerBeacon, EmergencyOverlay } from '../../components/effects/CinematicEffects';
import { useRealtimeStream } from '../../hooks/useRealtimeStream';
import type { ProcessedFrameMessage } from '../../types/detection';

const riskTone = {
  LOW: 'border-emerald-200 bg-emerald-50 text-emerald-700',
  MEDIUM: 'border-amber-200 bg-amber-50 text-amber-700',
  HIGH: 'border-orange-200 bg-orange-50 text-orange-700',
  CRITICAL: 'border-red-200 bg-red-50 text-red-700'
};

export function RealtimeStreamPanel() {
  const { frame, state, error } = useRealtimeStream();
  const connected = state === 'connected';
  const imageSrc = frame ? `data:image/jpeg;base64,${frame.frame}` : null;
  const isHighRisk = frame?.risk.riskLevel === 'HIGH' || frame?.risk.riskLevel === 'CRITICAL';

  return (
    <section className="relative overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      {isHighRisk ? <EmergencyOverlay /> : null}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 px-5 py-4">
        <div>
          <h2 className="flex items-center gap-2 text-lg font-semibold text-slate-950">
            <Radio size={19} className="text-cyan-600" />
            Processed AI Stream
          </h2>
          <p className="text-sm text-slate-500">Frame đã qua YOLO/OpenCV để detect lửa, khói, risk scoring và temporal smoothing.</p>
        </div>
        <ConnectionBadge state={state} />
      </div>

      <div className="grid gap-0 xl:grid-cols-[1.55fr_0.85fr]">
        <div className="camera-corners relative aspect-video bg-slate-950">
          {imageSrc ? (
            <img src={imageSrc} alt="Realtime processed fire detection stream" className="h-full w-full object-contain" />
          ) : (
            <div className="grid h-full place-items-center p-8 text-center text-slate-300">
              <div>
                <Camera className="mx-auto mb-3 text-slate-500" size={42} />
                <p className="text-sm font-semibold">Đang chờ frame từ AI service</p>
                <p className="mt-1 text-xs text-slate-500">Chạy AI service ở port 8100 rồi mở lại trang này.</p>
              </div>
            </div>
          )}

          <div className="absolute left-4 top-4 flex flex-wrap gap-2">
            <span className="rounded-full border border-white/15 bg-black/45 px-3 py-1 text-xs font-semibold text-white backdrop-blur">
              {frame?.cameraId ?? 'webcam-0'}
            </span>
            <span className="rounded-full border border-white/15 bg-black/45 px-3 py-1 text-xs font-semibold text-white backdrop-blur">
              {frame?.fps ? `${frame.fps.toFixed(1)} FPS` : 'FPS --'}
            </span>
          </div>

          <CameraOverlay danger={isHighRisk} />
        </div>

        <aside className="space-y-4 border-t border-slate-100 bg-slate-50/60 p-5 xl:border-l xl:border-t-0">
          <RiskSummary frame={frame} />
          <DetectionSummary frame={frame} />
          <StreamRecovery state={state} error={error} connected={connected} />
        </aside>
      </div>
    </section>
  );
}

function ConnectionBadge({ state }: { state: string }) {
  const tone = state === 'connected' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : state === 'error' ? 'bg-red-50 text-red-700 border-red-200' : 'bg-amber-50 text-amber-700 border-amber-200';
  const label = state === 'connected' ? 'CONNECTED' : state === 'reconnecting' ? 'RECONNECTING' : state === 'connecting' ? 'CONNECTING' : state.toUpperCase();

  return (
    <div className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-semibold ${tone}`}>
      <span className={`h-2 w-2 rounded-full ${state === 'connected' ? 'bg-emerald-500' : 'bg-amber-500'}`} />
      {label}
    </div>
  );
}

function RiskSummary({ frame }: { frame: ProcessedFrameMessage | null }) {
  const risk = frame?.risk;
  const level = risk?.riskLevel ?? 'LOW';

  return (
    <motion.div
      className="relative rounded-xl border border-slate-200 bg-white p-4"
      animate={level === 'HIGH' || level === 'CRITICAL' ? { boxShadow: ['0 0 0 rgba(239,68,68,0)', '0 0 28px rgba(239,68,68,0.18)', '0 0 0 rgba(239,68,68,0)'] } : undefined}
      transition={{ duration: 1.6, repeat: Infinity, ease: 'easeInOut' }}
    >
      {level === 'HIGH' || level === 'CRITICAL' ? (
        <div className="pointer-events-none absolute right-4 top-4 h-8 w-8 text-red-500">
          <DangerBeacon tone="danger">
            <span className="absolute left-1/2 top-1/2 h-2 w-2 -translate-x-1/2 -translate-y-1/2 rounded-full bg-current" />
          </DangerBeacon>
        </div>
      ) : null}
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">Risk Level</p>
          <p className="mt-1 text-3xl font-semibold text-slate-950">{risk?.riskScore?.toFixed(0) ?? '--'}</p>
        </div>
        <span className={`rounded-full border px-3 py-1 text-xs font-semibold ${riskTone[level]}`}>{level}</span>
      </div>
      <p className="mt-3 text-sm font-medium text-slate-700">{risk?.status ?? 'No active hazard'}</p>
      <div className="mt-4 grid grid-cols-2 gap-2 text-xs">
        <Metric label="Duration" value={`${risk?.durationSeconds?.toFixed(1) ?? '0.0'}s`} />
        <Metric label="Consistency" value={`${Math.round((risk?.frameConsistency ?? 0) * 100)}%`} />
        <Metric label="Fire" value={risk?.fireDetected ? 'Yes' : 'No'} />
        <Metric label="Smoke" value={risk?.smokeDetected ? 'Yes' : 'No'} />
        <Metric label="Fire Area" value={`${Math.round((risk?.fireAreaRatio ?? 0) * 100)}%`} />
        <Metric label="Smoke Area" value={`${Math.round((risk?.smokeAreaRatio ?? 0) * 100)}%`} />
      </div>
    </motion.div>
  );
}

function DetectionSummary({ frame }: { frame: ProcessedFrameMessage | null }) {
  const detections = frame?.detections ?? [];
  const fireCount = detections.filter((item) => item.label === 'fire').length;
  const smokeCount = detections.filter((item) => item.label === 'smoke').length;

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4">
      <p className="mb-3 text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">Realtime Objects</p>
      <div className="grid grid-cols-2 gap-2 text-center text-xs">
        <ObjectCount label="Fire" value={fireCount} tone="text-red-600 bg-red-50" />
        <ObjectCount label="Smoke" value={smokeCount} tone="text-slate-600 bg-slate-100" />
      </div>
      <div className="mt-4 space-y-2">
        {detections.slice(0, 5).map((item, index) => (
          <motion.div key={`${item.label}-${index}`} initial={{ opacity: 0, x: 8 }} animate={{ opacity: 1, x: 0 }} className="flex items-center justify-between rounded-lg bg-slate-50 px-3 py-2 text-sm">
            <span className="font-medium capitalize text-slate-700">{item.label}</span>
            <span className="text-slate-500">{Math.round(item.confidence * 100)}%</span>
          </motion.div>
        ))}
      </div>
    </div>
  );
}

function StreamRecovery({ state, error, connected }: { state: string; error: string | null; connected: boolean }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4">
      <div className="flex items-start gap-3">
        {connected ? <ShieldCheck className="text-emerald-600" size={20} /> : state === 'error' ? <CircleOff className="text-red-600" size={20} /> : <RefreshCcw className="text-amber-600" size={20} />}
        <div>
          <p className="text-sm font-semibold text-slate-900">{connected ? 'Realtime link healthy' : 'Auto recovery enabled'}</p>
          <p className="mt-1 text-xs leading-5 text-slate-500">
            {error ?? 'WebSocket tự reconnect bằng backoff. Nếu mất camera, AI service sẽ trả stream_error để UI hiển thị trạng thái lỗi rõ ràng.'}
          </p>
        </div>
      </div>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg bg-slate-50 p-2">
      <p className="text-slate-400">{label}</p>
      <p className="font-semibold text-slate-800">{value}</p>
    </div>
  );
}

function ObjectCount({ label, value, tone }: { label: string; value: number; tone: string }) {
  const Icon = label === 'Fire' ? AlertTriangle : Activity;
  return (
    <div className={`rounded-lg p-3 ${tone}`}>
      <Icon className="mx-auto mb-1" size={16} />
      <p className="text-lg font-semibold">{value}</p>
      <p className="font-medium">{label}</p>
    </div>
  );
}
