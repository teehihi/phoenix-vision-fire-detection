import { Bell, BellOff, Cpu, LoaderCircle, Wifi, WifiOff } from 'lucide-react';
import { useEffect, useState } from 'react';
import { getIotStatus, stopIotAlarm, triggerIotAlarm } from '../../lib/apiClient';

type IotStatus = {
  online: boolean;
  alarm: boolean;
};

export function IoTDeviceStatus() {
  const [status, setStatus] = useState<IotStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    async function fetchStatus() {
      try {
        const data = await getIotStatus();
        if (isMounted) {
          setStatus(data);
          setError(null);
        }
      } catch (err) {
        if (isMounted) {
          setStatus(null);
          setError('Không thể kết nối đến ESP32');
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    }

    fetchStatus();
    const interval = window.setInterval(fetchStatus, 5000);
    return () => {
      isMounted = false;
      window.clearInterval(interval);
    };
  }, []);

  async function handleTestAlarm() {
    setActionLoading(true);
    try {
      const data = await triggerIotAlarm();
      setStatus((prev) => prev ? { ...prev, alarm: data.alarm } : null);
    } catch {
      // Ignore
    } finally {
      setActionLoading(false);
    }
  }

  async function handleStopAlarm() {
    setActionLoading(true);
    try {
      const data = await stopIotAlarm();
      setStatus((prev) => prev ? { ...prev, alarm: data.alarm } : null);
    } catch {
      // Ignore
    } finally {
      setActionLoading(false);
    }
  }

  const isOnline = status?.online ?? false;
  const isAlarming = status?.alarm ?? false;

  return (
    <div className="flex h-11 items-center justify-between gap-3 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm transition-all hover:border-slate-300">
      <div className="flex h-full items-center gap-2 border-r border-slate-100 bg-slate-50 px-3 py-1">
        <Cpu size={16} className="text-slate-600" />
        <span className="text-sm font-semibold text-slate-700">ESP32 IoT</span>
        <div className={`ml-1 flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-xs font-semibold ${
          loading && !status ? 'border-slate-200 bg-slate-100 text-slate-500' :
          isOnline ? 'border-emerald-200 bg-emerald-50 text-emerald-700' : 'border-red-200 bg-red-50 text-red-700'
        }`}>
          {loading && !status ? (
            <>
              <LoaderCircle size={10} className="animate-spin" />
              Đang tải...
            </>
          ) : isOnline ? (
            <>
              <Wifi size={10} />
              Online
            </>
          ) : (
            <>
              <WifiOff size={10} />
              Offline
            </>
          )}
        </div>
      </div>

      <div className="flex items-center gap-2 px-3">
        {isAlarming ? (
          <div className="flex items-center gap-1.5 text-sm font-medium text-orange-600 animate-pulse">
            <Bell size={14} />
            Đang báo động
          </div>
        ) : (
          <div className="flex items-center gap-1.5 text-sm text-slate-500">
            <BellOff size={14} />
            Bình thường
          </div>
        )}

        <div className="ml-2 h-4 w-px bg-slate-200" />

        <div className="ml-2 flex items-center gap-1.5">
          <button
            onClick={handleTestAlarm}
            disabled={!isOnline || actionLoading}
            className="inline-flex h-7 items-center justify-center gap-1.5 rounded-lg bg-orange-50 px-3 text-xs font-semibold text-orange-700 transition hover:bg-orange-100 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {actionLoading && !isAlarming ? <LoaderCircle size={12} className="animate-spin" /> : <Bell size={12} />}
            Test Còi
          </button>
          <button
            onClick={handleStopAlarm}
            disabled={!isOnline || actionLoading}
            className="inline-flex h-7 items-center justify-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {actionLoading && isAlarming ? <LoaderCircle size={12} className="animate-spin" /> : <BellOff size={12} />}
            Tắt
          </button>
        </div>
      </div>
    </div>
  );
}
