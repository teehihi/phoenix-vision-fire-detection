import { Bell, BellOff, Cpu, Droplet, LoaderCircle, Wifi, WifiOff } from 'lucide-react';
import { useEffect, useState } from 'react';
import { getIotStatus, stopIotAlarm, triggerIotAlarm, turnOffPump, turnOnPump } from '../../lib/apiClient';

type IotStatus = {
  online: boolean;
  alarm: boolean;
  pump: boolean;
  alarm_level?: string;
};

export function IoTDeviceStatus() {
  const [status, setStatus] = useState<IotStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [testLevel, setTestLevel] = useState<string>('medium');

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

  async function handleTestAlarm(level: string = 'medium') {
    setActionLoading(true);
    try {
      const data = await triggerIotAlarm(level);
      setStatus((prev) => prev ? { ...prev, alarm: data.alarm, alarm_level: level } : null);
    } catch {
      // Ignore
    } finally {
      setActionLoading(false);
    }
  }

  async function handleStopAlarm() {
    setActionLoading(true);
    try {
      await stopIotAlarm();
      setStatus((prev) => prev ? { ...prev, alarm: false, pump: false } : null);
    } catch {
      // Ignore
    } finally {
      setActionLoading(false);
    }
  }

  async function handleTogglePump() {
    if (!status) return;
    const isPumpActive = status.pump ?? false;
    setActionLoading(true);
    try {
      if (isPumpActive) {
        const data = await turnOffPump();
        setStatus((prev) => prev ? { ...prev, pump: data.pump } : null);
      } else {
        const data = await turnOnPump();
        setStatus((prev) => prev ? { ...prev, pump: data.pump } : null);
      }
    } catch {
      // Ignore
    } finally {
      setActionLoading(false);
    }
  }

  const isOnline = status?.online ?? false;
  const isAlarming = status?.alarm ?? false;
  const isPumpActive = status?.pump ?? false;

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
          <div className={`flex items-center gap-1.5 text-sm font-semibold animate-pulse ${
            status?.alarm_level === 'medium' ? 'text-amber-600' :
            status?.alarm_level === 'high' ? 'text-orange-600' :
            'text-rose-600 font-bold text-red-600'
          }`}>
            <Bell size={14} className={status?.alarm_level === 'critical' ? 'animate-bounce' : ''} />
            {status?.alarm_level === 'medium' ? 'Cảnh báo vừa' :
             status?.alarm_level === 'high' ? 'Báo động lớn' :
             'KHẨN CẤP! BÁO ĐỘNG'}
          </div>
        ) : (
          <div className="flex items-center gap-1.5 text-sm text-slate-500">
            <BellOff size={14} />
            Bình thường
          </div>
        )}

        <div className="ml-2 h-4 w-px bg-slate-200" />

        <div className="ml-2 flex items-center gap-1.5">
          <div className="flex items-center gap-1">
            <select
              value={testLevel}
              onChange={(e) => setTestLevel(e.target.value)}
              disabled={!isOnline || actionLoading}
              className="h-7 rounded-lg border border-slate-200 bg-white px-1.5 text-[11px] font-semibold text-slate-700 outline-none hover:border-slate-300 focus:border-orange-300 disabled:opacity-50"
            >
              <option value="medium">Mức vừa</option>
              <option value="high">Mức cao</option>
              <option value="critical">Khẩn cấp</option>
            </select>
            <button
              onClick={() => handleTestAlarm(testLevel)}
              disabled={!isOnline || actionLoading}
              className="inline-flex h-7 items-center justify-center gap-1 rounded-lg bg-orange-50 px-2.5 text-xs font-semibold text-orange-700 transition hover:bg-orange-100 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {actionLoading && !isAlarming ? <LoaderCircle size={12} className="animate-spin" /> : <Bell size={12} />}
              Test Còi
            </button>
          </div>
          
          <button
            onClick={handleTogglePump}
            disabled={!isOnline || actionLoading}
            className={`inline-flex h-7 items-center justify-center gap-1.5 rounded-lg px-3 text-xs font-semibold transition disabled:cursor-not-allowed disabled:opacity-50 ${
              isPumpActive 
                ? 'bg-blue-100 text-blue-700 hover:bg-blue-200' 
                : 'bg-blue-50 text-blue-700 hover:bg-blue-100'
            }`}
          >
            {actionLoading && isPumpActive ? <LoaderCircle size={12} className="animate-spin" /> : <Droplet size={12} />}
            {isPumpActive ? 'Tắt Bơm' : 'Bật Bơm'}
          </button>

          <button
            onClick={handleStopAlarm}
            disabled={!isOnline || actionLoading}
            className="inline-flex h-7 items-center justify-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {actionLoading && (isAlarming || isPumpActive) ? <LoaderCircle size={12} className="animate-spin" /> : <BellOff size={12} />}
            Tắt
          </button>
        </div>
      </div>
    </div>
  );
}
