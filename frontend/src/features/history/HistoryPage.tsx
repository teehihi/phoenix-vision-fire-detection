import { IncidentTimeline } from './IncidentTimeline';

export function HistoryPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-slate-950">Detection History</h1>
        <p className="text-sm text-slate-500">Search, filter, and replay incident activity across detections, risk changes, and emergency transitions.</p>
      </div>
      <IncidentTimeline />
    </div>
  );
}
