import { AnimatePresence, motion } from 'framer-motion';
import { AlertTriangle, Bell, CheckCircle2, Flame, ShieldCheck, Siren, X } from 'lucide-react';
import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { EmergencyOverlay } from '../../components/effects/CinematicEffects';
import { SecureStorageImage } from '../../components/ui/SecureStorageImage';
import { getEmergencyStatus, acknowledgeEmergency, resolveEmergency } from '../../lib/apiClient';
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
  const [soundEnabled, setSoundEnabled] = useState(() => {
    return localStorage.getItem('soundEnabled') !== 'false';
  });
  const [error, setError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [acknowledgedEvents, setAcknowledgedEvents] = useState<string[]>([]);

  useEffect(() => {
    const handleSoundChanged = () => {
      setSoundEnabled(localStorage.getItem('soundEnabled') !== 'false');
    };
    window.addEventListener('sound-enabled-changed', handleSoundChanged);
    return () => window.removeEventListener('sound-enabled-changed', handleSoundChanged);
  }, []);

  const toggleSound = () => {
    const newVal = !soundEnabled;
    setSoundEnabled(newVal);
    localStorage.setItem('soundEnabled', String(newVal));
    window.dispatchEvent(new Event('sound-enabled-changed'));
  };

  async function loadStatus() {
    try {
      const nextStatus = await getEmergencyStatus();
      setStatus(nextStatus);
      setError(null);
    } catch {
      setError('Không lấy được trạng thái khẩn cấp từ backend.');
    }
  }

  useEffect(() => {
    loadStatus();
    const intervalId = window.setInterval(loadStatus, 3000);
    return () => {
      window.clearInterval(intervalId);
    };
  }, []);

  async function handleAcknowledge() {
    if (!status?.activeEventId) return;
    setActionLoading(true);
    try {
      await acknowledgeEmergency(status.activeEventId);
      setAcknowledgedEvents(prev => [...prev, status.activeEventId!]);
    } catch {
      alert('Không thể xác nhận sự cố.');
    } finally {
      setActionLoading(false);
    }
  }

  async function handleResolve() {
    if (!status?.activeEventId) return;
    if (!window.confirm('Bạn có chắc chắn sự cố đã được khắc phục hoàn toàn?')) return;
    setActionLoading(true);
    try {
      await resolveEmergency(status.activeEventId);
      await loadStatus();
    } catch {
      alert('Không thể hoàn thành khắc phục sự cố.');
    } finally {
      setActionLoading(false);
    }
  }

  const state = status?.state ?? 'monitoring';
  const style = stateStyles[state];
  const Icon = style.icon;

  return (
    <motion.section
      className={`relative overflow-hidden rounded-lg border p-5 shadow-sm ${style.className}`}
      animate={state === 'emergency' || state === 'critical' ? { scale: [1, 1.006, 1] } : { scale: 1 }}
      transition={{ duration: 1.2, repeat: state === 'emergency' || state === 'critical' ? Infinity : 0, ease: 'easeInOut' }}
    >
      <AnimatePresence>{state === 'emergency' || state === 'critical' ? <EmergencyOverlay /> : null}</AnimatePresence>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex items-start gap-3">
          <motion.div
            className="rounded-md bg-white/70 p-2 text-current"
            animate={state === 'monitoring' ? { rotate: 0 } : { rotate: [0, -4, 4, 0] }}
            transition={{ duration: 1.1, repeat: state === 'monitoring' ? 0 : Infinity, ease: 'easeInOut' }}
          >
            <Icon size={22} />
          </motion.div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide opacity-75">Emergency state</p>
            <h2 className="text-2xl font-semibold">{style.label}</h2>
            <p className="mt-1 text-sm opacity-80">
              {status?.humanAtRisk ? 'HUMAN AT RISK' : status?.state === 'monitoring' ? 'Hệ thống đang giám sát bình thường.' : 'Đang theo dõi nguy cơ cháy theo thời gian thực.'}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <motion.button
            whileTap={{ scale: 0.96 }}
            whileHover={{ y: -1 }}
            className="inline-flex items-center gap-2 rounded-md bg-white/80 px-3 py-2 text-sm font-medium text-slate-900 hover:bg-white"
            onClick={toggleSound}
          >
            <Bell size={16} />
            {soundEnabled ? 'Tắt âm báo' : 'Bật âm báo'}
          </motion.button>

          {state !== 'monitoring' && status?.activeEventId ? (
            <>
              {!acknowledgedEvents.includes(status.activeEventId) ? (
                <motion.button
                  whileTap={{ scale: 0.96 }}
                  whileHover={{ y: -1 }}
                  disabled={actionLoading}
                  className="inline-flex items-center gap-2 rounded-md bg-blue-600 px-3 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50"
                  onClick={handleAcknowledge}
                >
                  <CheckCircle2 size={16} />
                  Xác nhận
                </motion.button>
              ) : (
                <span className="inline-flex items-center gap-1.5 rounded-md bg-blue-100 px-2.5 py-2 text-xs font-semibold text-blue-800">
                  <CheckCircle2 size={14} />
                  Đã xác nhận
                </span>
              )}

              <motion.button
                whileTap={{ scale: 0.96 }}
                whileHover={{ y: -1 }}
                disabled={actionLoading}
                className="inline-flex items-center gap-2 rounded-md bg-emerald-600 px-3 py-2 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-50"
                onClick={handleResolve}
              >
                <CheckCircle2 size={16} />
                Khắc phục xong
              </motion.button>
            </>
          ) : null}
        </div>
      </div>

      {!compact ? (
        <div className="mt-5 grid gap-3 sm:grid-cols-4">
          <Metric label="Risk score" value={`${Math.round(status?.riskScore ?? 0)}/100`} />
          <Metric label="Risk level" value={status?.riskLevel ?? 'LOW'} />
          <Metric label="Escalations" value={String(status?.escalationCount ?? 0)} />
          <Metric label="Camera" value={status?.cameraId ?? 'webcam-0'} />
        </div>
      ) : null}

      {status?.snapshotUrl ? (
        <div className="mt-4 overflow-hidden rounded-md border border-white/40 bg-black/10">
          <SecureStorageImage source={status.snapshotUrl} alt="Emergency snapshot" className="max-h-56 w-full object-cover" />
        </div>
      ) : null}

      {error ? <p className="mt-3 text-sm font-medium text-red-700">{error}</p> : null}

    </motion.section>
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
