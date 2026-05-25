export function AlertsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-slate-950">Alerts</h1>
        <p className="text-sm text-slate-500">Review active incidents and acknowledge resolved detections.</p>
      </div>
      <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
        <p className="text-sm text-slate-500">Alert feed placeholder. Connect to GET /api/v1/alerts.</p>
      </div>
    </div>
  );
}
