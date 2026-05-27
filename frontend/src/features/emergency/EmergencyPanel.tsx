import { AlertTriangle, Bell, CheckCircle2, Flame, ShieldCheck, Siren } from 'lucide-react';
import { useEffect, useState } from 'react';
import { getEmergencyStatus } from '../../lib/apiClient';
import type { EmergencyState, EmergencyStatus } from '../../types/detection';
import { useEmergencyTone } from '../../hooks/useEmergencyTone';

const stateStyles: Record<EmergencyState, { label: string; className: string; icon: typeof ShieldCheck }> = {
  monitoring: {
    label: 'Monitoring',
    className: 'border-emerald-200 bg-emerald-50 text-emerald-800',
    icon: ShieldCheck
  },
  warning: {
    label: 'Warning',
    className: 'border-amber-200 bg-amber-50 text-amber-900 emergency-pulse-soft',
    icon: AlertTriangle
  },
  emergency: {
    label: 'Emergency',
    className: 'border-red-200 bg-red-50 text-red-900 emergency-pulse',
    icon: Siren
  },
  critical: {
    label: 'Critical',
    className: 'border-fuchsia-300 bg-fuchsia-950 text-white emergency-flash',
    icon: Flame
  }
};

type EmergencyPanelProps = {
  compact?: boolean;
};

export function EmergencyPanel({ compact = false }: EmergencyPanelProps) {
  const [status, setStatus] = useState<EmergencyStatus | null>(null);
  const [soundEnabled, setSoundEnabled] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEmergencyTone(status?.state ?? 'monitoring', soundEnabled);

  useEffect(() => {
    let isMounted = true;

    async function loadStatus() {
      try {
        const nextStatus = await getEmergencyStatus();
        if (isMounted) {
          setStatus(nextStatus);
          setError(null);
        }
      } catch {
        if (isMounted) {
          setError('Không lấy được trạng thái khẩn cấp từ backend.');
        }
      }
    }

    loadStatus();
    const intervalId = window.setInterval(loadStatus, 3000);
    return () => {
      isMounted = false;
      window.clearInterval(intervalId);
    };
  }, []);

  const state = status?.state ?? 'monitoring';
  const style = stateStyles[state];
  const Icon = style.icon;

  return (
    <section className={`rounded-lg border p-5 shadow-sm ${style.className}`}>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex items-start gap-3">
          <div className="rounded-md bg-white/70 p-2 text-current">
            <Icon size={22} />
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide opacity-75">Emergency state</p>
            <h2 className="text-2xl font-semibold">{style.label}</h2>
            <p className="mt-1 text-sm opacity-80">
              {status?.humanAtRisk ? 'HUMAN AT RISK' : status?.state === 'monitoring' ? 'Hệ thống đang giám sát bình thường.' : 'Đang theo dõi nguy cơ cháy theo thời gian thực.'}
            </p>
          </div>
        </div>

        <button
          className="inline-flex items-center gap-2 rounded-md bg-white/80 px-3 py-2 text-sm font-medium text-slate-900 hover:bg-white"
          onClick={() => setSoundEnabled((value) => !value)}
        >
          <Bell size={16} />
          {soundEnabled ? 'Tắt âm báo' : 'Bật âm báo'}
        </button>
      </div>

      {!compact ? (
        <div className="mt-5 grid gap-3 sm:grid-cols-4">
          <Metric label="Risk score" value={`${Math.round(status?.riskScore ?? 0)}/100`} />
          <Metric label="Risk level" value={status?.riskLevel ?? 'LOW'} />
          <Metric label="Escalations" value={String(status?.escalationCount ?? 0)} />
          <Metric label="Camera" value={status?.cameraId ?? 'webcam-01'} />
        </div>
      ) : null}

      {status?.snapshotUrl ? (
        <div className="mt-4 overflow-hidden rounded-md border border-white/40 bg-black/10">
          <img src={status.snapshotUrl} alt="Emergency snapshot" className="max-h-56 w-full object-cover" />
        </div>
      ) : null}

      {error ? <p className="mt-3 text-sm font-medium text-red-700">{error}</p> : null}
    </section>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md bg-white/70 p-3 text-slate-950">
      <p className="text-xs font-medium uppercase text-slate-500">{label}</p>
      <p className="mt-1 text-lg font-semibold">{value}</p>
    </div>
  );
}
