import { AlertTriangle, Camera, Clock, Flame, ShieldAlert } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { getIncidentTimeline, type IncidentTimelineFilters } from '../../lib/apiClient';
import type { IncidentTimelineEvent } from '../../types/detection';

const riskClasses = {
  LOW: 'bg-sky-50 text-sky-700 ring-sky-200',
  MEDIUM: 'bg-amber-50 text-amber-800 ring-amber-200',
  HIGH: 'bg-red-50 text-red-700 ring-red-200',
  CRITICAL: 'bg-fuchsia-950 text-white ring-fuchsia-300'
};

export function IncidentTimeline() {
  const [events, setEvents] = useState<IncidentTimelineEvent[]>([]);
  const [filters, setFilters] = useState<IncidentTimelineFilters>({});
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    async function loadEvents() {
      try {
        const data = await getIncidentTimeline(filters);
        if (isMounted) {
          setEvents(data);
          setError(null);
        }
      } catch {
        if (isMounted) {
          setError('Không tải được incident timeline từ backend.');
        }
      }
    }

    loadEvents();
    const intervalId = window.setInterval(loadEvents, 4000);
    return () => {
      isMounted = false;
      window.clearInterval(intervalId);
    };
  }, [filters]);

  const hasFilters = useMemo(() => Object.values(filters).some(Boolean), [filters]);

  return (
    <section className="space-y-4">
      <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
        <div className="grid gap-3 md:grid-cols-4">
          <select
            className="rounded-md border border-slate-200 px-3 py-2 text-sm"
            value={filters.riskLevel ?? ''}
            onChange={(event) => setFilters((current) => ({ ...current, riskLevel: event.target.value || undefined }))}
          >
            <option value="">Tất cả risk</option>
            <option value="LOW">LOW</option>
            <option value="MEDIUM">MEDIUM</option>
            <option value="HIGH">HIGH</option>
            <option value="CRITICAL">CRITICAL</option>
          </select>

          <select
            className="rounded-md border border-slate-200 px-3 py-2 text-sm"
            value={filters.eventType ?? ''}
            onChange={(event) => setFilters((current) => ({ ...current, eventType: event.target.value || undefined }))}
          >
            <option value="">Tất cả sự kiện</option>
            <option value="detection">Detection</option>
            <option value="risk_change">Risk change</option>
            <option value="emergency_transition">Emergency transition</option>
            <option value="snapshot">Snapshot</option>
            <option value="operator_action">Operator action</option>
          </select>

          <input
            className="rounded-md border border-slate-200 px-3 py-2 text-sm"
            type="datetime-local"
            onChange={(event) => setFilters((current) => ({ ...current, dateFrom: event.target.value ? new Date(event.target.value).toISOString() : undefined }))}
          />

          <button
            className="rounded-md border border-slate-200 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50"
            disabled={!hasFilters}
            onClick={() => setFilters({})}
          >
            Xóa bộ lọc
          </button>
        </div>
      </div>

      {error ? <p className="rounded-md bg-red-50 p-3 text-sm text-red-700">{error}</p> : null}

      <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-slate-950">Incident Timeline</h2>
            <p className="text-sm text-slate-500">Cập nhật realtime mỗi 4 giây, có snapshot và metadata vận hành.</p>
          </div>
          <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-600">{events.length} events</span>
        </div>

        <div className="space-y-4">
          {events.length ? events.map((event) => <TimelineItem key={event.id} event={event} />) : <EmptyTimeline />}
        </div>
      </div>
    </section>
  );
}

function TimelineItem({ event }: { event: IncidentTimelineEvent }) {
  const Icon = event.humanAtRisk ? ShieldAlert : event.eventType === 'snapshot' ? Camera : event.riskLevel === 'LOW' ? Clock : Flame;

  return (
    <article className="relative grid gap-4 rounded-lg border border-slate-200 p-4 transition hover:border-slate-300 hover:bg-slate-50 md:grid-cols-[1fr_180px]">
      <div className="flex gap-3">
        <div className={`mt-1 flex h-10 w-10 items-center justify-center rounded-full ring-1 ${riskClasses[event.riskLevel]}`}>
          <Icon size={18} />
        </div>
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="font-semibold text-slate-950">{event.title}</h3>
            <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ring-1 ${riskClasses[event.riskLevel]}`}>{event.riskLevel}</span>
            <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-600">{event.eventType}</span>
          </div>
          <p className="mt-1 text-sm text-slate-600">{event.description}</p>
          <div className="mt-3 flex flex-wrap gap-3 text-xs text-slate-500">
            <span>{new Date(event.createdAt).toLocaleString()}</span>
            {event.confidence != null ? <span>Confidence {(event.confidence * 100).toFixed(0)}%</span> : null}
            {event.riskScore != null ? <span>Risk {event.riskScore.toFixed(0)}/100</span> : null}
            {event.fireAreaRatio != null ? <span>Fire area {(event.fireAreaRatio * 100).toFixed(1)}%</span> : null}
            {event.humanAtRisk ? <span className="font-semibold text-red-600">Human danger</span> : null}
          </div>
        </div>
      </div>

      {event.snapshotUrl ? (
        <img src={event.snapshotUrl} alt={event.title} className="h-28 w-full rounded-md object-cover md:h-full" />
      ) : (
        <div className="hidden items-center justify-center rounded-md bg-slate-100 text-slate-400 md:flex">
          <AlertTriangle size={20} />
        </div>
      )}
    </article>
  );
}

function EmptyTimeline() {
  return (
    <div className="rounded-lg border border-dashed border-slate-200 p-8 text-center">
      <p className="text-sm font-medium text-slate-600">Chưa có incident event nào.</p>
      <p className="mt-1 text-sm text-slate-500">Khi backend nhận detection/risk/emergency event, timeline sẽ tự cập nhật.</p>
    </div>
  );
}
