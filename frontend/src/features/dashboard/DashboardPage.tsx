import { StatCard } from '../../components/ui/StatCard';

export function DashboardPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-slate-950">Dashboard</h1>
        <p className="text-sm text-slate-500">Monitor detections, alert status, and camera health.</p>
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Active Cameras" value="1" trend="Webcam ready" />
        <StatCard label="Detections Today" value="0" />
        <StatCard label="Open Alerts" value="0" />
        <StatCard label="AI Service" value="Online" />
      </div>
      <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="text-lg font-semibold text-slate-950">Recent Activity</h2>
        <p className="mt-3 text-sm text-slate-500">Detection events will appear here after inference starts.</p>
      </div>
    </div>
  );
}
