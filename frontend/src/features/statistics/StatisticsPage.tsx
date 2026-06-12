import { motion } from 'framer-motion';
import {
  Activity,
  AlertTriangle,
  CheckCircle2,
  Clock3,
  Cloud,
  Flame,
  RefreshCw,
  ShieldCheck,
  Siren,
  Users
} from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { getEmergencyStatus, getIncidentTimeline, triggerMockEmergency } from '../../lib/apiClient';
import type { EmergencyStatus, IncidentTimelineEvent } from '../../types/detection';
import { groupIncidentTimeline } from '../history/incidentGrouping';

const riskMeta = {
  LOW: {
    label: 'Bình thường',
    description: 'Không ghi nhận dấu hiệu cháy hoặc khói',
    badge: 'border-emerald-200 bg-emerald-50 text-emerald-700',
    dot: 'bg-emerald-500',
    bar: 'bg-emerald-500'
  },
  MEDIUM: {
    label: 'Cần chú ý',
    description: 'Phát hiện tín hiệu bất thường cần theo dõi',
    badge: 'border-amber-200 bg-amber-50 text-amber-700',
    dot: 'bg-amber-500',
    bar: 'bg-amber-500'
  },
  HIGH: {
    label: 'Nguy hiểm',
    description: 'Nguy cơ cháy cao, cần kiểm tra ngay',
    badge: 'border-orange-200 bg-orange-50 text-orange-700',
    dot: 'bg-orange-500',
    bar: 'bg-orange-500'
  },
  CRITICAL: {
    label: 'Khẩn cấp',
    description: 'Kích hoạt quy trình ứng phó và sơ tán',
    badge: 'border-red-200 bg-red-50 text-red-700',
    dot: 'bg-red-500',
    bar: 'bg-red-500'
  }
} as const;

type RiskLevel = keyof typeof riskMeta;

export function StatisticsPage() {
  const [status, setStatus] = useState<EmergencyStatus | null>(null);
  const [timelineEvents, setTimelineEvents] = useState<IncidentTimelineEvent[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [testLoading, setTestLoading] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  async function loadData() {
    try {
      const [currentStatus, timeline] = await Promise.all([
        getEmergencyStatus(),
        getIncidentTimeline()
      ]);
      setStatus(currentStatus);
      setTimelineEvents(timeline.slice(0, 60));
      setLastUpdated(new Date());
      setError(null);
    } catch {
      setError('Không thể kết nối máy chủ. Số liệu có thể chưa được cập nhật.');
    }
  }

  useEffect(() => {
    loadData();
    const statusInterval = window.setInterval(loadData, 15000);
    return () => window.clearInterval(statusInterval);
  }, []);

  const hourlyData = useMemo(() => buildHourlyData(timelineEvents), [timelineEvents]);
  const distribution = useMemo(() => buildRiskDistribution(timelineEvents), [timelineEvents]);
  const incidentGroups = useMemo(() => groupIncidentTimeline(timelineEvents), [timelineEvents]);
  const systemRiskLevel = useMemo(() => deriveSystemRiskLevel(status, timelineEvents), [status, timelineEvents]);
  const currentRisk = riskMeta[systemRiskLevel];
  const isDanger = systemRiskLevel === 'HIGH' || systemRiskLevel === 'CRITICAL';
  const smokeDensity = systemRiskLevel === 'CRITICAL' ? 82 : systemRiskLevel === 'HIGH' ? 65 : systemRiskLevel === 'MEDIUM' ? 25 : 0;
  const activeIncidentCount = incidentGroups.filter((incident) => isRecentIncident(incident.endAt)).length;
  const humanAtRisk = Boolean(status?.humanAtRisk) || timelineEvents.some((event) => isRecentEvent(event.createdAt) && event.humanAtRisk);
  const currentRiskScore = Math.max(
    status?.riskScore ?? 0,
    ...timelineEvents.filter((event) => isRecentEvent(event.createdAt)).map((event) => event.riskScore ?? 0),
    0,
  );
  const maxHourlyValue = Math.max(...hourlyData.map((item) => item.value), 1);
  const averageRisk = timelineEvents.length
    ? Math.round(timelineEvents.reduce((sum, event) => sum + (event.riskScore ?? 0), 0) / timelineEvents.length)
    : 0;

  const metrics = [
    {
      label: 'Điểm rủi ro hiện tại',
      value: `${Math.round(currentRiskScore)}`,
      unit: '/ 100',
      note: currentRisk.label,
      icon: Activity,
      tone: isDanger ? 'text-red-600 bg-red-50' : 'text-emerald-600 bg-emerald-50'
    },
    {
      label: 'Mật độ khói ước tính',
      value: `${smokeDensity}`,
      unit: '%',
      note: smokeDensity ? 'Đang ghi nhận' : 'Không phát hiện',
      icon: Cloud,
      tone: smokeDensity ? 'text-orange-600 bg-orange-50' : 'text-slate-600 bg-slate-100'
    },
    {
      label: 'Người trong vùng rủi ro',
      value: humanAtRisk ? '1' : '0',
      unit: 'người',
      note: humanAtRisk ? 'Cần hỗ trợ' : 'Khu vực an toàn',
      icon: Users,
      tone: humanAtRisk ? 'text-red-600 bg-red-50' : 'text-blue-600 bg-blue-50'
    },
    {
      label: 'Sự kiện 12 giờ gần nhất',
      value: `${hourlyData.reduce((sum, item) => sum + item.value, 0)}`,
      unit: 'event',
      note: `${timelineEvents.length} bản ghi`,
      icon: Clock3,
      tone: timelineEvents.length ? 'text-blue-600 bg-blue-50' : 'text-slate-500 bg-slate-100'
    }
  ];

  async function handleTriggerTest(level: 'LOW' | 'CRITICAL') {
    setTestLoading(true);
    try {
      await triggerMockEmergency({
        cameraId: 'webcam-0',
        riskLevel: level,
        riskScore: level === 'CRITICAL' ? 95 : 0,
        humanAtRisk: level === 'CRITICAL',
        message: level === 'CRITICAL'
          ? 'Mô phỏng cháy khẩn cấp từ Dashboard UI'
          : 'Khôi phục trạng thái an toàn'
      });
      await loadData();
    } catch {
      window.alert('Không thể thực hiện mô phỏng.');
    } finally {
      setTestLoading(false);
    }
  }

  return (
    <motion.div
      className="space-y-5"
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25 }}
    >
      <header className="border-b border-slate-200 pb-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <div className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
              <span>Trung tâm vận hành</span>
              <span className="text-slate-300">/</span>
              <span>Thống kê</span>
            </div>
            <h1 className="text-2xl font-semibold tracking-tight text-slate-950">Tổng quan an toàn cháy</h1>
            <p className="mt-1 text-sm text-slate-500">
              Theo dõi rủi ro, hiệu suất phân tích và các sự kiện gần nhất trong một màn hình.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="mr-2 inline-flex items-center gap-2 text-xs text-slate-500">
              <RefreshCw size={13} />
              {lastUpdated ? `Cập nhật ${formatTime(lastUpdated)}` : 'Đang cập nhật'}
            </span>
            <button
              type="button"
              disabled={testLoading}
              onClick={() => handleTriggerTest('CRITICAL')}
              className="inline-flex h-9 items-center gap-2 rounded-lg border border-red-200 bg-white px-3 text-xs font-semibold text-red-700 transition hover:bg-red-50 disabled:opacity-50"
            >
              <Siren size={15} />
              Mô phỏng sự cố
            </button>
            <button
              type="button"
              disabled={testLoading}
              onClick={() => handleTriggerTest('LOW')}
              className="inline-flex h-9 items-center gap-2 rounded-lg bg-slate-900 px-3 text-xs font-semibold text-white transition hover:bg-slate-800 disabled:opacity-50"
            >
              <ShieldCheck size={15} />
              Đặt trạng thái an toàn
            </button>
          </div>
        </div>
      </header>

      <section className={`flex flex-col gap-4 rounded-xl border px-4 py-3 sm:flex-row sm:items-center sm:justify-between ${currentRisk.badge}`}>
        <div className="flex items-center gap-3">
          <span className={`h-2.5 w-2.5 rounded-full ${currentRisk.dot} ${isDanger ? 'animate-pulse' : ''}`} />
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider opacity-70">Trạng thái vận hành</p>
            <div className="mt-0.5 flex flex-wrap items-baseline gap-x-3 gap-y-1">
              <p className="text-base font-semibold">{currentRisk.label}</p>
              <p className="text-sm opacity-80">{currentRisk.description}</p>
            </div>
          </div>
        </div>
        <div className="flex gap-5 text-xs">
          <StatusItem label="API" active={Boolean(status)} />
          <StatusItem label="AI Engine" active={Boolean(status)} />
        </div>
      </section>

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {metrics.map((metric) => (
          <MetricCard key={metric.label} {...metric} />
        ))}
      </section>

      <section className="grid gap-5 xl:grid-cols-[minmax(0,1.65fr)_minmax(300px,0.75fr)]">
        <Panel>
          <PanelHeader
            title="Xu hướng sự kiện"
            description="Số sự kiện được ghi nhận theo giờ trong 12 giờ gần nhất"
            aside={
              <div className="text-right">
                <p className="text-xl font-semibold text-slate-950">{timelineEvents.length}</p>
                <p className="text-xs text-slate-500">sự kiện gần đây</p>
              </div>
            }
          />
          <div className="mt-7 flex h-52 items-end gap-2 border-b border-slate-200 px-1">
            {hourlyData.map((item) => {
              const height = item.value === 0 ? 3 : Math.max((item.value / maxHourlyValue) * 100, 12);
              return (
                <div key={item.label} className="group flex h-full min-w-0 flex-1 flex-col items-center justify-end">
                  <div className="relative flex h-full w-full items-end justify-center">
                    <span className="pointer-events-none absolute bottom-[calc(100%+6px)] hidden rounded bg-slate-900 px-2 py-1 text-[10px] text-white group-hover:block">
                      {item.value} sự kiện
                    </span>
                    <div
                      className={`w-full max-w-9 rounded-t-sm transition-all group-hover:opacity-80 ${item.value ? 'bg-blue-600' : 'bg-slate-200'}`}
                      style={{ height: `${height}%` }}
                    />
                  </div>
                  <span className="mt-2 text-[10px] text-slate-400">{item.label}</span>
                </div>
              );
            })}
          </div>
          <div className="mt-4 flex flex-wrap gap-x-6 gap-y-2 text-xs text-slate-500">
            <span><strong className="font-semibold text-slate-800">{averageRisk}</strong> điểm rủi ro trung bình</span>
            <span><strong className="font-semibold text-slate-800">{activeIncidentCount}</strong> incident gần đây</span>
            <span><strong className="font-semibold text-slate-800">{distribution.CRITICAL + distribution.HIGH}</strong> sự kiện nghiêm trọng</span>
          </div>
        </Panel>

        <Panel>
          <PanelHeader title="Phân bố mức độ" description="Theo các sự kiện gần nhất" />
          <div className="mt-6 space-y-5">
            {(Object.keys(riskMeta) as RiskLevel[]).map((level) => {
              const count = distribution[level];
              const percentage = timelineEvents.length ? Math.round((count / timelineEvents.length) * 100) : 0;
              return (
                <div key={level}>
                  <div className="mb-2 flex items-center justify-between text-sm">
                    <span className="flex items-center gap-2 font-medium text-slate-700">
                      <span className={`h-2 w-2 rounded-full ${riskMeta[level].dot}`} />
                      {riskMeta[level].label}
                    </span>
                    <span className="tabular-nums text-slate-500">{count} <span className="text-slate-300">/</span> {percentage}%</span>
                  </div>
                  <div className="h-1.5 overflow-hidden rounded-full bg-slate-100">
                    <div className={`h-full rounded-full ${riskMeta[level].bar}`} style={{ width: `${percentage}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
        </Panel>
      </section>

      <section className="grid gap-5 xl:grid-cols-[minmax(0,1.15fr)_minmax(360px,0.85fr)]">
        <IncidentSummary events={timelineEvents} />
        <Panel>
          <PanelHeader
            title="Nhật ký gần đây"
            description="Cập nhật tự động từ hệ thống"
            aside={<Clock3 size={17} className="text-slate-400" />}
          />
          <div className="mt-4 divide-y divide-slate-100">
            {timelineEvents.slice(0, 5).map((event) => (
              <div key={event.id} className="flex gap-3 py-3 first:pt-1">
                <span className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${riskMeta[event.riskLevel].dot}`} />
                <div className="min-w-0 flex-1">
                  <div className="flex items-start justify-between gap-3">
                    <p className="truncate text-sm font-medium text-slate-800">{event.title}</p>
                    <time className="shrink-0 text-[11px] tabular-nums text-slate-400">
                      {formatEventTime(event.createdAt)}
                    </time>
                  </div>
                  <p className="mt-0.5 line-clamp-2 text-xs leading-5 text-slate-500">{event.description}</p>
                </div>
              </div>
            ))}
            {!timelineEvents.length ? (
              <div className="py-10 text-center">
                <CheckCircle2 className="mx-auto text-emerald-500" size={28} />
                <p className="mt-2 text-sm font-medium text-slate-700">Chưa có sự kiện mới</p>
                <p className="mt-1 text-xs text-slate-400">Hệ thống đang hoạt động bình thường</p>
              </div>
            ) : null}
          </div>
        </Panel>
      </section>

      <section className="grid gap-3 md:grid-cols-3">
        <HealthItem
          icon={ShieldCheck}
          title="Tính sẵn sàng hệ thống"
          value={status ? '99.9%' : 'Ngoại tuyến'}
          description={status ? 'Backend và AI engine phản hồi bình thường' : 'Không nhận được phản hồi từ máy chủ'}
          healthy={Boolean(status)}
        />
        <HealthItem
          icon={Flame}
          title="Cảnh báo đang mở"
          value={String(activeIncidentCount).padStart(2, '0')}
          description={isDanger ? 'Có cảnh báo cần người vận hành xử lý' : 'Không có cảnh báo cần xử lý'}
          healthy={!isDanger}
        />
        <HealthItem
          icon={Clock3}
          title="Cập nhật gần nhất"
          value={lastUpdated ? formatTime(lastUpdated) : '--:--'}
          description="Số liệu thống kê tự làm mới mỗi 15 giây"
          healthy
        />
      </section>

      {error ? (
        <div className="flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          <AlertTriangle size={16} />
          {error}
        </div>
      ) : null}
    </motion.div>
  );
}

function IncidentSummary({ events }: { events: IncidentTimelineEvent[] }) {
  const operatorActions = events.filter((event) => event.eventType === 'operator_action').length;
  const humanRiskEvents = events.filter((event) => event.humanAtRisk).length;
  const lastEvent = events[0];
  const recentIncidentCount = groupIncidentTimeline(events).filter((incident) => isRecentIncident(incident.endAt)).length;

  return (
    <Panel>
      <PanelHeader
        title="Tóm tắt vận hành"
        description="Dành cho phần thống kê, không hiển thị live camera"
        aside={<ShieldCheck size={17} className="text-slate-400" />}
      />
      <div className="mt-5 grid gap-3 sm:grid-cols-3">
        <SummaryTile label="Incident gần đây" value={String(recentIncidentCount).padStart(2, '0')} />
        <SummaryTile label="Thao tác vận hành" value={String(operatorActions).padStart(2, '0')} />
        <SummaryTile label="Có người trong vùng nguy hiểm" value={String(humanRiskEvents).padStart(2, '0')} />
      </div>
      <div className="mt-5 rounded-lg border border-slate-200 bg-slate-50 p-4">
        <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Sự kiện mới nhất</p>
        {lastEvent ? (
          <>
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <span className={`h-2 w-2 rounded-full ${riskMeta[lastEvent.riskLevel].dot}`} />
              <p className="text-sm font-semibold text-slate-900">{lastEvent.title}</p>
              <span className={`rounded-full border px-2 py-0.5 text-[11px] font-semibold ${riskMeta[lastEvent.riskLevel].badge}`}>
                {riskMeta[lastEvent.riskLevel].label}
              </span>
            </div>
            <p className="mt-2 text-sm leading-6 text-slate-500">{lastEvent.description}</p>
            <p className="mt-3 text-xs text-slate-400">{new Date(lastEvent.createdAt).toLocaleString('vi-VN')}</p>
          </>
        ) : (
          <p className="mt-3 text-sm text-slate-500">Chưa có incident nào được ghi nhận.</p>
        )}
      </div>
    </Panel>
  );
}

function SummaryTile({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-3">
      <p className="text-[11px] font-medium text-slate-500">{label}</p>
      <p className="mt-2 text-xl font-semibold tabular-nums text-slate-950">{value}</p>
    </div>
  );
}

function MetricCard({
  label,
  value,
  unit,
  note,
  icon: Icon,
  tone
}: {
  label: string;
  value: string;
  unit: string;
  note: string;
  icon: typeof Activity;
  tone: string;
}) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-[0_1px_2px_rgba(15,23,42,0.03)]">
      <div className="flex items-start justify-between gap-3">
        <div className={`grid h-9 w-9 place-items-center rounded-lg ${tone}`}>
          <Icon size={18} />
        </div>
        <span className="text-[11px] font-medium text-slate-400">{note}</span>
      </div>
      <p className="mt-4 text-xs font-medium text-slate-500">{label}</p>
      <p className="mt-1 flex items-baseline gap-1.5 text-2xl font-semibold tabular-nums text-slate-950">
        {value}
        <span className="text-xs font-medium text-slate-400">{unit}</span>
      </p>
    </div>
  );
}

function Panel({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`rounded-xl border border-slate-200 bg-white p-5 shadow-[0_1px_2px_rgba(15,23,42,0.03)] ${className}`}>
      {children}
    </div>
  );
}

function PanelHeader({
  title,
  description,
  aside
}: {
  title: string;
  description: string;
  aside?: React.ReactNode;
}) {
  return (
    <div className="flex items-start justify-between gap-4">
      <div>
        <h2 className="text-sm font-semibold text-slate-900">{title}</h2>
        <p className="mt-1 text-xs text-slate-500">{description}</p>
      </div>
      {aside}
    </div>
  );
}

function StatusItem({ label, active }: { label: string; active: boolean }) {
  return (
    <span className="inline-flex items-center gap-1.5 font-medium">
      <span className={`h-1.5 w-1.5 rounded-full ${active ? 'bg-current' : 'bg-slate-400'}`} />
      {label}
    </span>
  );
}

function HealthItem({
  icon: Icon,
  title,
  value,
  description,
  healthy
}: {
  icon: typeof Activity;
  title: string;
  value: string;
  description: string;
  healthy: boolean;
}) {
  return (
    <div className="flex items-center gap-4 rounded-xl border border-slate-200 bg-white p-4">
      <div className={`grid h-10 w-10 shrink-0 place-items-center rounded-lg ${healthy ? 'bg-slate-100 text-slate-600' : 'bg-red-50 text-red-600'}`}>
        <Icon size={19} />
      </div>
      <div className="min-w-0">
        <div className="flex items-baseline gap-2">
          <p className="truncate text-xs font-medium text-slate-500">{title}</p>
          <p className="text-sm font-semibold tabular-nums text-slate-900">{value}</p>
        </div>
        <p className="mt-1 truncate text-xs text-slate-400">{description}</p>
      </div>
    </div>
  );
}

function buildHourlyData(events: IncidentTimelineEvent[]) {
  const now = new Date();
  return Array.from({ length: 12 }, (_, index) => {
    const hour = new Date(now);
    hour.setMinutes(0, 0, 0);
    hour.setHours(hour.getHours() - (11 - index));
    const nextHour = new Date(hour);
    nextHour.setHours(nextHour.getHours() + 1);
    const value = events.filter((event) => {
      const eventTime = new Date(event.createdAt);
      return eventTime >= hour && eventTime < nextHour;
    }).length;
    return {
      label: hour.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }),
      value
    };
  });
}

function buildRiskDistribution(events: IncidentTimelineEvent[]) {
  return events.reduce<Record<RiskLevel, number>>(
    (result, event) => {
      result[event.riskLevel] += 1;
      return result;
    },
    { LOW: 0, MEDIUM: 0, HIGH: 0, CRITICAL: 0 }
  );
}

function deriveSystemRiskLevel(status: EmergencyStatus | null, events: IncidentTimelineEvent[]): RiskLevel {
  const recentEvents = events.filter((event) => isRecentEvent(event.createdAt));
  const recentHighest = recentEvents.reduce<RiskLevel>(
    (highest, event) => riskPriority[event.riskLevel] > riskPriority[highest] ? event.riskLevel : highest,
    'LOW',
  );
  const statusRisk = (status?.riskLevel ?? 'LOW') as RiskLevel;
  return riskPriority[recentHighest] > riskPriority[statusRisk] ? recentHighest : statusRisk;
}

function isRecentEvent(value: string) {
  return Date.now() - new Date(value).getTime() <= 15 * 60 * 1000;
}

function isRecentIncident(value: string) {
  return Date.now() - new Date(value).getTime() <= 15 * 60 * 1000;
}

const riskPriority: Record<RiskLevel, number> = {
  LOW: 0,
  MEDIUM: 1,
  HIGH: 2,
  CRITICAL: 3,
};

function formatTime(date: Date) {
  return date.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
}

function formatEventTime(value: string) {
  return new Date(value).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
}
