import { useEffect, useState } from 'react';
import { EmergencyPanel } from '../emergency/EmergencyPanel';
import { getAlerts, deleteAlert, clearAllAlerts } from '../../lib/apiClient';
import type { AlertEvent } from '../../types/detection';
import { AlertCircle, Siren, CheckCircle2, Trash2 } from 'lucide-react';
import { useTranslation } from '../../lib/i18n';
import { IoTDeviceStatus } from '../detection/IoTDeviceStatus';

export function AlertsPage() {
  const { t } = useTranslation();
  const [alerts, setAlerts] = useState<AlertEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function fetchAlerts() {
    try {
      const data = await getAlerts();
      // Sắp xếp cảnh báo mới nhất lên đầu
      const sorted = [...data].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      setAlerts(sorted);
      setError(null);
    } catch {
      setError('Không thể lấy danh sách cảnh báo từ máy chủ.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchAlerts();
    const interval = window.setInterval(fetchAlerts, 3000);
    return () => window.clearInterval(interval);
  }, []);

  const severityStyles: Record<string, string> = {
    low: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    medium: 'bg-amber-50 text-amber-700 border-amber-200',
    high: 'bg-orange-50 text-orange-700 border-orange-200',
    critical: 'bg-red-50 text-red-700 border-red-200 animate-pulse'
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-slate-950">{t('alerts_title', 'Danh sách Cảnh báo')}</h1>
          <p className="text-sm text-slate-500">{t('alerts_subtitle', 'Các báo động cần xử lý')}</p>
        </div>
        <IoTDeviceStatus />
      </div>

      <EmergencyPanel compact />

      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-slate-950 flex items-center gap-2">
            <Siren size={18} className="text-cyan-600 animate-pulse" />
            Danh sách cảnh báo phát hiện (Alert Feed)
          </h2>
          {alerts.length > 0 ? (
            <button
              type="button"
              onClick={async () => {
                if (window.confirm('Bạn có chắc chắn muốn xóa tất cả cảnh báo không?')) {
                  try {
                    await clearAllAlerts();
                    fetchAlerts();
                  } catch {
                    alert('Không thể xóa tất cả cảnh báo.');
                  }
                }
              }}
              className="flex items-center gap-1 rounded-lg border border-rose-200 bg-rose-50 px-3 py-1.5 text-xs font-semibold text-rose-700 hover:bg-rose-100 transition active:scale-95"
            >
              <Trash2 size={13} />
              Xóa tất cả
            </button>
          ) : null}
        </div>

        {error ? (
          <p className="text-sm font-medium text-red-600">{error}</p>
        ) : loading && alerts.length === 0 ? (
          <p className="text-sm text-slate-500">Đang tải danh sách cảnh báo...</p>
        ) : alerts.length === 0 ? (
          <div className="rounded-lg border border-slate-200 bg-white p-8 text-center shadow-sm">
            <CheckCircle2 className="mx-auto h-8 w-8 text-slate-400" />
            <p className="mt-3 text-sm font-medium text-slate-900">Không có cảnh báo nào</p>
            <p className="mt-1 text-sm text-slate-500">Hệ thống đang hoạt động an toàn và chưa ghi nhận cảnh báo nào vượt ngưỡng tự động.</p>
          </div>
        ) : (
          <div className="grid gap-3">
            {alerts.map((alertItem) => {
              const timeStr = new Date(alertItem.createdAt).toLocaleString('vi-VN');
              return (
                <div
                  key={alertItem.id}
                  className={`flex flex-col md:flex-row md:items-center justify-between gap-4 rounded-xl border bg-white p-5 shadow-sm transition hover:shadow-md ${
                    alertItem.severity === 'critical' ? 'border-red-200 bg-red-50/10' : 'border-slate-200'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <div className={`mt-0.5 rounded-lg p-2.5 ${alertItem.severity === 'critical' ? 'bg-red-50 text-red-600' : 'bg-slate-100 text-slate-600'}`}>
                      <AlertCircle size={20} />
                    </div>
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="font-semibold text-slate-900">{alertItem.title}</h3>
                        <span className={`rounded-full border px-2.5 py-0.5 text-xs font-semibold uppercase ${severityStyles[alertItem.severity] || 'bg-slate-50 text-slate-600 border-slate-200'}`}>
                          {alertItem.severity}
                        </span>
                      </div>
                      <p className="mt-1 text-sm text-slate-600">{alertItem.message}</p>
                      <p className="mt-2 text-xs text-slate-400">{timeStr}</p>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={async () => {
                      if (window.confirm('Bạn có chắc chắn muốn xóa cảnh báo này không?')) {
                        try {
                          await deleteAlert(alertItem.id);
                          fetchAlerts();
                        } catch {
                          alert('Không thể xóa cảnh báo.');
                        }
                      }
                    }}
                    className="flex items-center justify-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-rose-600 transition hover:bg-rose-50 hover:border-rose-200 active:scale-95 shrink-0 self-end md:self-center"
                    title="Xóa cảnh báo"
                  >
                    <Trash2 size={14} />
                    Xóa
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
