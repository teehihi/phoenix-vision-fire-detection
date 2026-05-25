export function HistoryPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-slate-950">Detection History</h1>
        <p className="text-sm text-slate-500">Search, filter, and review historical fire and smoke detections.</p>
      </div>
      <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
        <p className="text-sm text-slate-500">History table placeholder. Connect to GET /api/v1/detections.</p>
      </div>
    </div>
  );
}
