import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { AnimatePresence } from 'framer-motion';
import { EmergencyPanel } from '../emergency/EmergencyPanel';
import { getAlerts, deleteAlert, clearAllAlerts, getIncidentTimeline } from '../../lib/apiClient';
import type { AlertEvent, IncidentTimelineEvent } from '../../types/detection';
import { AlertCircle, ChevronDown, ChevronRight, Siren, CheckCircle2, Trash2 } from 'lucide-react';
import { useTranslation } from '../../lib/i18n';
import { IoTDeviceStatus } from '../detection/IoTDeviceStatus';
import { groupAlertsByIncident, groupIncidentTimeline, type GroupedAlertIncident } from '../history/incidentGrouping';
import { SecureStorageImage } from '../../components/ui/SecureStorageImage';
import { ImageFullscreenModal, type FullscreenImageDetails } from '../../components/ui/ImageFullscreenModal';
import { useCameraMonitoring } from '../detection/CameraMonitoringContext';

export function AlertsPage() {
  const { t } = useTranslation();
  const [alerts, setAlerts] = useState<AlertEvent[]>([]);
  const [timelineEvents, setTimelineEvents] = useState<IncidentTimelineEvent[]>([]);
  const [expandedIncidentId, setExpandedIncidentId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [previewImage, setPreviewImage] = useState<{ src: string; details: FullscreenImageDetails } | null>(null);

  async function fetchAlerts() {
    try {
      const [data, timeline] = await Promise.all([
        getAlerts(),
        getIncidentTimeline(),
      ]);
      // Sắp xếp cảnh báo mới nhất lên đầu
      const sorted = [...data].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      setAlerts(sorted);
      setTimelineEvents(timeline);
      setError(null);
    } catch {
      setError('Không thể lấy danh sách cảnh báo từ máy chủ.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchAlerts();
    const interval = window.setInterval(fetchAlerts, 10000);
    return () => window.clearInterval(interval);
  }, []);

  const incidents = useMemo(() => groupIncidentTimeline(timelineEvents, alerts), [timelineEvents, alerts]);
  const alertIncidents = useMemo(() => groupAlertsByIncident(alerts, incidents), [alerts, incidents]);

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
        <p className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs leading-5 text-slate-500">
          Cảnh báo được gom theo từng đợt sự cố để tránh trùng lặp khi một camera phát hiện liên tiếp nhiều frame tương tự. Dữ liệu cũ có thể tự dọn theo cấu hình lưu trữ của hệ thống, mặc định khoảng 30 ngày.
        </p>

        {error ? (
          <p className="text-sm font-medium text-red-600">{error}</p>
        ) : loading && alerts.length === 0 ? (
          <p className="text-sm text-slate-500">Đang tải danh sách cảnh báo...</p>
        ) : alertIncidents.length === 0 ? (
          <div className="rounded-lg border border-slate-200 bg-white p-8 text-center shadow-sm">
            <CheckCircle2 className="mx-auto h-8 w-8 text-slate-400" />
            <p className="mt-3 text-sm font-medium text-slate-900">Không có cảnh báo nào</p>
            <p className="mt-1 text-sm text-slate-500">Hệ thống đang hoạt động an toàn và chưa ghi nhận cảnh báo nào vượt ngưỡng tự động.</p>
          </div>
        ) : (
          <div className="grid gap-3">
            {alertIncidents.map((incident) => (
              <AlertIncidentCard
                key={incident.id}
                incident={incident}
                expanded={expandedIncidentId === incident.id}
                severityStyles={severityStyles}
                onToggle={() => setExpandedIncidentId((current) => current === incident.id ? null : incident.id)}
                onDeleteAlert={async (alertId) => {
                  if (!window.confirm('Bạn có chắc chắn muốn xóa cảnh báo này không?')) return;
                  try {
                    await deleteAlert(alertId);
                    fetchAlerts();
                  } catch {
                    alert('Không thể xóa cảnh báo.');
                  }
                }}
                onDeleteGroup={async () => {
                  if (!window.confirm('Xóa toàn bộ cảnh báo trong incident này?')) return;
                  try {
                    await Promise.all(incident.alerts.map((alertItem) => deleteAlert(alertItem.id)));
                    fetchAlerts();
                  } catch {
                    alert('Không thể xóa nhóm cảnh báo.');
                  }
                }}
                onImageClick={(src, details) => setPreviewImage({ src, details })}
              />
            ))}
          </div>
        )}
      </div>

      <AnimatePresence>
        {previewImage ? (
          <ImageFullscreenModal src={previewImage.src} details={previewImage.details} onClose={() => setPreviewImage(null)} />
        ) : null}
      </AnimatePresence>
    </div>
  );
}

function AlertIncidentCard({
  incident,
  expanded,
  severityStyles,
  onToggle,
  onDeleteAlert,
  onDeleteGroup,
  onImageClick,
}: {
  incident: GroupedAlertIncident;
  expanded: boolean;
  severityStyles: Record<string, string>;
  onToggle: () => void;
  onDeleteAlert: (alertId: string) => void;
  onDeleteGroup: () => void;
  onImageClick: (url: string, details: FullscreenImageDetails) => void;
}) {
  const { registryCameras } = useCameraMonitoring();
  const camera = registryCameras.find(cam => cam.id === incident.cameraId);
  const location = camera?.location || (incident.cameraId === 'webcam-0' ? 'Máy hiện tại' : undefined);
  const zone = camera?.zone || (incident.cameraId === 'webcam-0' ? 'Nguồn kiểm thử' : undefined);
  const isCritical = incident.severity === 'critical';
  const detailUrl = incident.timelineIncident ? `/history?incident=${incident.timelineIncident.id}` : '/history';

  return (
    <article
      className={`rounded-xl border bg-white p-5 shadow-sm transition hover:shadow-md ${
        isCritical ? 'border-red-200 bg-red-50/10' : 'border-slate-200'
      }`}
    >
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="flex min-w-0 flex-1 items-start gap-3">
          <div className={`mt-0.5 rounded-lg p-2.5 ${isCritical ? 'bg-red-50 text-red-600' : 'bg-slate-100 text-slate-600'}`}>
            <AlertCircle size={20} />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <button type="button" onClick={onToggle} className="inline-flex min-w-0 items-center gap-1 text-left font-semibold text-slate-900 hover:text-cyan-700">
                {expanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                <span className="truncate">{camera?.name || (incident.cameraId === 'webcam-0' ? 'Webcam local' : incident.cameraId)} - {incident.title}</span>
              </button>
              <span className={`rounded-full border px-2.5 py-0.5 text-xs font-semibold uppercase ${severityStyles[incident.severity] || 'bg-slate-50 text-slate-600 border-slate-200'}`}>
                {incident.severity}
              </span>
              <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs text-slate-600">
                {incident.alerts.length} cảnh báo
              </span>
              {incident.occurrenceCount > 1 ? (
                <span className="rounded-full bg-orange-50 px-2.5 py-0.5 text-xs font-semibold text-orange-700">
                  {incident.occurrenceCount} lần ghi nhận
                </span>
              ) : null}
            </div>
            <p className="mt-1 text-sm text-slate-600">{incident.message}</p>
            <div className="mt-2 flex flex-wrap items-center gap-3 text-xs text-slate-400">
              <span>Bắt đầu {new Date(incident.startAt).toLocaleString('vi-VN')}</span>
              <span>Gần nhất {new Date(incident.lastSeenAt).toLocaleString('vi-VN')}</span>
              <Link to={detailUrl} className="font-semibold text-cyan-700 hover:text-cyan-800">
                Xem incident chi tiết
              </Link>
            </div>
          </div>
        </div>

        {incident.snapshotUrl ? (
          <SecureStorageImage
            source={incident.snapshotUrl}
            alt={incident.title}
            className="h-16 w-24 shrink-0 rounded-lg object-cover border border-slate-100 shadow-sm cursor-pointer hover:opacity-90 transition active:scale-[0.98]"
            onClick={(e) => {
              const confidenceEvent = incident.timelineIncident?.events.find((ev) => ev.confidence != null);
              const riskScoreEvent = incident.timelineIncident?.events.find((ev) => ev.riskScore != null);
              onImageClick(e.currentTarget.src, {
                title: incident.title,
                cameraId: incident.cameraId,
                cameraName: camera?.name || (incident.cameraId === 'webcam-0' ? 'Webcam local' : undefined),
                location,
                zone,
                riskLevel: incident.severity.toUpperCase(),
                riskScore: riskScoreEvent?.riskScore ?? undefined,
                confidence: confidenceEvent?.confidence ?? undefined,
                time: `Bắt đầu: ${new Date(incident.startAt).toLocaleString('vi-VN')} · Gần nhất: ${new Date(incident.lastSeenAt).toLocaleString('vi-VN')}`,
                description: incident.message,
                humanAtRisk: incident.timelineIncident?.humanAtRisk
              });
            }}
          />
        ) : null}

        <button
          type="button"
          onClick={onDeleteGroup}
          className="flex shrink-0 items-center justify-center gap-1.5 self-end rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-rose-600 transition hover:bg-rose-50 hover:border-rose-200 active:scale-95 md:self-center"
          title="Xóa nhóm cảnh báo"
        >
          <Trash2 size={14} />
          Xóa nhóm
        </button>
      </div>

      {expanded ? (
        <div className="mt-4 space-y-2 border-t border-slate-200 pt-4">
          {incident.alerts.map((alertItem) => (
            <div key={alertItem.id} className="flex flex-col gap-3 rounded-lg border border-slate-200 bg-white px-3 py-3 sm:flex-row sm:items-center sm:justify-between animate-fadeIn">
              <div className="min-w-0 flex-1 flex items-start gap-3">
                {alertItem.snapshotUrl ? (
                  <SecureStorageImage
                    source={alertItem.snapshotUrl}
                    alt={alertItem.title}
                    className="h-12 w-16 shrink-0 rounded object-cover border border-slate-100 shadow-sm cursor-pointer hover:opacity-90 transition active:scale-[0.98]"
                    onClick={(e) => {
                      const correspondingEvent = incident.timelineIncident?.events.find(
                        (ev) => ev.id === alertItem.detectionId
                      );
                      onImageClick(e.currentTarget.src, {
                        title: alertItem.title,
                        cameraId: incident.cameraId,
                        cameraName: camera?.name || (incident.cameraId === 'webcam-0' ? 'Webcam local' : undefined),
                        location,
                        zone,
                        riskLevel: alertItem.severity.toUpperCase(),
                        riskScore: correspondingEvent?.riskScore ?? undefined,
                        confidence: correspondingEvent?.confidence ?? undefined,
                        time: `${new Date(alertItem.createdAt).toLocaleString('vi-VN')} - gần nhất ${new Date(alertItem.lastSeenAt).toLocaleString('vi-VN')}`,
                        description: alertItem.message,
                        humanAtRisk: correspondingEvent?.humanAtRisk
                      });
                    }}
                  />
                ) : null}
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-semibold text-slate-900">{alertItem.title}</p>
                    <span className={`rounded-full border px-2 py-0.5 text-xs font-semibold uppercase ${severityStyles[alertItem.severity] || 'bg-slate-50 text-slate-600 border-slate-200'}`}>
                      {alertItem.severity}
                    </span>
                    {alertItem.occurrenceCount > 1 ? (
                      <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-600">{alertItem.occurrenceCount} lần</span>
                    ) : null}
                  </div>
                  <p className="mt-1 text-sm text-slate-600">{alertItem.message}</p>
                  <p className="mt-2 text-xs text-slate-400">
                    {new Date(alertItem.createdAt).toLocaleString('vi-VN')} - gần nhất {new Date(alertItem.lastSeenAt).toLocaleString('vi-VN')}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => onDeleteAlert(alertItem.id)}
                className="flex shrink-0 items-center justify-center gap-1.5 self-end rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-rose-600 transition hover:bg-rose-50 hover:border-rose-200 active:scale-95 sm:self-center"
                title="Xóa cảnh báo"
              >
                <Trash2 size={14} />
                Xóa
              </button>
            </div>
          ))}
        </div>
      ) : null}
    </article>
  );
}
