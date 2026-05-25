type StatCardProps = {
  label: string;
  value: string;
  trend?: string;
};

export function StatCard({ label, value, trend }: StatCardProps) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
      <p className="text-sm text-slate-500">{label}</p>
      <p className="mt-2 text-3xl font-semibold text-slate-950">{value}</p>
      {trend ? <p className="mt-2 text-sm text-brand-700">{trend}</p> : null}
    </div>
  );
}
