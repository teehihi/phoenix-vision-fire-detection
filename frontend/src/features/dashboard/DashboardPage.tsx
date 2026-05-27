import { motion } from 'framer-motion';
import { AlertTriangle, Activity, Camera, Cloud, Flame, Radio, ShieldAlert, Siren, Users } from 'lucide-react';
import { EmergencyPanel } from '../emergency/EmergencyPanel';

const metrics = [
  { label: 'Fire Confidence', value: '88%', trend: '+12% stability', icon: Flame, color: 'text-red-600', bg: 'bg-red-50' },
  { label: 'Smoke Density', value: '42%', trend: 'moderate spread', icon: Cloud, color: 'text-slate-600', bg: 'bg-slate-100' },
  { label: 'Humans Nearby', value: '02', trend: '1 at risk zone', icon: Users, color: 'text-amber-600', bg: 'bg-amber-50' },
  { label: 'AI Latency', value: '31ms', trend: 'realtime', icon: Activity, color: 'text-cyan-600', bg: 'bg-cyan-50' }
];

const timeline = [
  { time: '14:36:20', title: 'Risk score increased', detail: 'HIGH 72/100', level: 'high' },
  { time: '14:36:12', title: 'Person entered danger zone', detail: 'Human at risk', level: 'critical' },
  { time: '14:35:58', title: 'Smoke detected', detail: 'Confidence 79%', level: 'medium' },
  { time: '14:35:41', title: 'Fire detected', detail: 'Area 12.4%', level: 'high' }
];

const variants = {
  hidden: { opacity: 0, y: 16 },
  show: { opacity: 1, y: 0 }
};

export function DashboardPage() {
  return (
    <motion.div
      className="min-h-screen space-y-6 rounded-[28px] bg-[radial-gradient(circle_at_top_left,#e0f2fe_0,#f8fafc_34%,#ffffff_100%)] p-1"
      initial="hidden"
      animate="show"
      transition={{ staggerChildren: 0.08 }}
    >
      <motion.header variants={variants} className="overflow-hidden rounded-2xl border border-white/80 bg-white/75 p-6 shadow-[0_24px_80px_rgba(15,23,42,0.08)] backdrop-blur-xl">
        <div className="flex flex-wrap items-start justify-between gap-5">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-cyan-200 bg-cyan-50 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-cyan-700">
              <Radio size={14} />
              PhoenixVision Command Center
            </div>
            <h1 className="mt-4 max-w-3xl text-4xl font-semibold tracking-tight text-slate-950">
              AI Fire Early Warning Dashboard
            </h1>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-600">
              Realtime surveillance, risk scoring, emergency state monitoring, and incident timeline for apartment and mini building safety teams.
            </p>
          </div>
          <div className="rounded-2xl border border-red-100 bg-red-50/80 px-5 py-4 text-right shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-red-500">Current posture</p>
            <p className="mt-1 text-3xl font-semibold text-red-700">HIGH</p>
            <p className="mt-1 text-xs text-red-500">Human danger analysis active</p>
          </div>
        </div>
      </motion.header>

      <motion.div variants={variants}>
        <EmergencyPanel compact />
      </motion.div>

      <motion.section variants={variants} className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {metrics.map((metric) => (
          <MetricCard key={metric.label} {...metric} />
        ))}
      </motion.section>

      <section className="grid gap-6 xl:grid-cols-[1.65fr_0.95fr]">
        <motion.div variants={variants} className="rounded-2xl border border-white/80 bg-white/75 p-5 shadow-[0_24px_80px_rgba(15,23,42,0.08)] backdrop-blur-xl">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="flex items-center gap-2 text-lg font-semibold text-slate-950">
                <Camera size={20} className="text-cyan-600" />
                Realtime Surveillance Feed
              </h2>
              <p className="text-sm text-slate-500">Camera A01 - Lobby Corridor</p>
            </div>
            <div className="flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700">
              <span className="h-2 w-2 rounded-full bg-emerald-500 shadow-[0_0_12px_rgba(16,185,129,0.9)]" />
              LIVE 30 FPS
            </div>
          </div>

          <div className="relative aspect-video overflow-hidden rounded-xl border border-slate-200 bg-slate-950 shadow-inner">
            <div className="absolute inset-0 bg-[linear-gradient(120deg,rgba(14,165,233,0.18),transparent_35%,rgba(239,68,68,0.20))]" />
            <div className="absolute inset-x-0 top-0 h-14 bg-gradient-to-b from-slate-950/80 to-transparent" />
            <div className="absolute left-[18%] top-[28%] h-[28%] w-[18%] rounded-md border-2 border-red-500 shadow-[0_0_24px_rgba(239,68,68,0.75)]">
              <Label text="fire 0.88" tone="danger" />
            </div>
            <div className="absolute left-[48%] top-[18%] h-[34%] w-[26%] rounded-md border-2 border-slate-300 shadow-[0_0_24px_rgba(148,163,184,0.55)]">
              <Label text="smoke 0.79" tone="smoke" />
            </div>
            <div className="absolute bottom-[18%] right-[22%] h-[42%] w-[14%] rounded-md border-2 border-amber-400 shadow-[0_0_24px_rgba(245,158,11,0.75)]">
              <Label text="person" tone="warning" />
            </div>
            <div className="absolute bottom-5 left-5 rounded-lg border border-white/15 bg-white/10 px-4 py-3 text-white backdrop-blur">
              <p className="text-xs uppercase tracking-[0.2em] text-cyan-200">Danger zone</p>
              <p className="mt-1 text-sm font-semibold">Human proximity risk detected</p>
            </div>
          </div>
        </motion.div>

        <motion.aside variants={variants} className="space-y-6">
          <RiskGauge />
          <IncidentMiniTimeline />
        </motion.aside>
      </section>

      <motion.section variants={variants} className="grid gap-6 lg:grid-cols-3">
        <AlertCard title="Emergency Alerts" value="03" icon={Siren} tone="red" description="1 critical escalation waiting for operator acknowledgement." />
        <AlertCard title="Snapshot Evidence" value="18" icon={Camera} tone="cyan" description="Auto-captured frames attached to risk and emergency events." />
        <AlertCard title="System Integrity" value="99.8%" icon={ShieldAlert} tone="emerald" description="Camera stream, backend API, and AI service are operational." />
      </motion.section>
    </motion.div>
  );
}

function MetricCard({ label, value, trend, icon: Icon, color, bg }: (typeof metrics)[number]) {
  return (
    <motion.div variants={variants} whileHover={{ y: -3 }} className="rounded-2xl border border-white/80 bg-white/80 p-5 shadow-sm backdrop-blur-xl">
      <div className="flex items-center justify-between">
        <div className={`rounded-xl ${bg} p-3 ${color}`}>
          <Icon size={20} />
        </div>
        <span className="rounded-full bg-slate-100 px-2 py-1 text-xs font-medium text-slate-500">{trend}</span>
      </div>
      <p className="mt-5 text-sm font-medium text-slate-500">{label}</p>
      <p className="mt-1 text-3xl font-semibold text-slate-950">{value}</p>
    </motion.div>
  );
}

function RiskGauge() {
  return (
    <div className="rounded-2xl border border-white/80 bg-white/80 p-5 shadow-sm backdrop-blur-xl">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-slate-950">Dynamic Risk</h2>
          <p className="text-sm text-slate-500">Score uses area, duration, proximity, and consistency.</p>
        </div>
        <AlertTriangle className="text-red-500" size={22} />
      </div>
      <div className="mx-auto mt-6 grid h-52 w-52 place-items-center rounded-full bg-[conic-gradient(#ef4444_0_72%,#e2e8f0_72%_100%)] p-4 shadow-[0_18px_60px_rgba(239,68,68,0.18)]">
        <div className="grid h-full w-full place-items-center rounded-full bg-white text-center">
          <div>
            <p className="text-5xl font-semibold text-slate-950">72</p>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-red-500">High Risk</p>
          </div>
        </div>
      </div>
      <div className="mt-5 grid grid-cols-3 gap-2 text-center text-xs">
        <div className="rounded-lg bg-red-50 p-2 text-red-700">Fire 88%</div>
        <div className="rounded-lg bg-amber-50 p-2 text-amber-700">Human 1</div>
        <div className="rounded-lg bg-cyan-50 p-2 text-cyan-700">Stable 91%</div>
      </div>
    </div>
  );
}

function IncidentMiniTimeline() {
  return (
    <div className="rounded-2xl border border-white/80 bg-white/80 p-5 shadow-sm backdrop-blur-xl">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-lg font-semibold text-slate-950">Live Timeline</h2>
        <span className="rounded-full bg-cyan-50 px-2 py-1 text-xs font-semibold text-cyan-700">realtime</span>
      </div>
      <div className="space-y-3">
        {timeline.map((item) => (
          <div key={`${item.time}-${item.title}`} className="flex gap-3 rounded-xl border border-slate-100 bg-slate-50/80 p-3">
            <div className={`mt-1 h-3 w-3 rounded-full ${item.level === 'critical' ? 'bg-fuchsia-600' : item.level === 'high' ? 'bg-red-500' : 'bg-amber-400'}`} />
            <div>
              <p className="text-xs text-slate-400">{item.time}</p>
              <p className="text-sm font-semibold text-slate-900">{item.title}</p>
              <p className="text-xs text-slate-500">{item.detail}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function AlertCard({ title, value, description, icon: Icon, tone }: { title: string; value: string; description: string; icon: typeof Siren; tone: 'red' | 'cyan' | 'emerald' }) {
  const toneClass = {
    red: 'bg-red-50 text-red-600',
    cyan: 'bg-cyan-50 text-cyan-600',
    emerald: 'bg-emerald-50 text-emerald-600'
  }[tone];

  return (
    <motion.div variants={variants} whileHover={{ y: -3 }} className="rounded-2xl border border-white/80 bg-white/80 p-5 shadow-sm backdrop-blur-xl">
      <div className={`inline-flex rounded-xl p-3 ${toneClass}`}>
        <Icon size={20} />
      </div>
      <p className="mt-5 text-sm font-medium text-slate-500">{title}</p>
      <p className="mt-1 text-3xl font-semibold text-slate-950">{value}</p>
      <p className="mt-2 text-sm leading-6 text-slate-500">{description}</p>
    </motion.div>
  );
}

function Label({ text, tone }: { text: string; tone: 'danger' | 'warning' | 'smoke' }) {
  const toneClass = {
    danger: 'bg-red-500',
    warning: 'bg-amber-400 text-slate-950',
    smoke: 'bg-slate-200 text-slate-900'
  }[tone];

  return <span className={`absolute -top-7 left-0 rounded px-2 py-1 text-xs font-semibold text-white ${toneClass}`}>{text}</span>;
}
