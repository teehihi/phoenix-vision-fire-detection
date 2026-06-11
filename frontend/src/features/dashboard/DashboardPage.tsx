import { motion } from 'framer-motion';
import { AlertTriangle, Activity, Camera, Cloud, Flame, Radio, ShieldAlert, Siren, Users } from 'lucide-react';
import { useEffect, useState } from 'react';
import { CameraOverlay, CinematicShell, DangerBeacon, RiskPulseRing } from '../../components/effects/CinematicEffects';
import { EmergencyPanel } from '../emergency/EmergencyPanel';
import { getEmergencyStatus, getIncidentTimeline, triggerMockEmergency } from '../../lib/apiClient';
import type { EmergencyStatus, IncidentTimelineEvent } from '../../types/detection';
import { useCameraMonitoring } from '../detection/CameraMonitoringContext';
import { useTranslation } from '../../lib/i18n';

const variants = {
  hidden: { opacity: 0, y: 16 },
  show: { opacity: 1, y: 0 }
};



export function DashboardPage() {
  const { t } = useTranslation();
  const [status, setStatus] = useState<EmergencyStatus | null>(null);
  const [timelineEvents, setTimelineEvents] = useState<IncidentTimelineEvent[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [testLoading, setTestLoading] = useState(false);
  
  const { primaryStream } = useCameraMonitoring();

  useEffect(() => {
    let isMounted = true;

    async function loadData() {
      try {
        const currentStatus = await getEmergencyStatus();
        const timeline = await getIncidentTimeline();
        if (isMounted) {
          setStatus(currentStatus);
          setTimelineEvents(timeline.slice(0, 4));
          setError(null);
        }
      } catch (err) {
        if (isMounted) {
          setError('Không kết nối được với máy chủ API.');
        }
      }
    }

    loadData();
    const statusInterval = window.setInterval(loadData, 3000);
    return () => {
      isMounted = false;
      window.clearInterval(statusInterval);
    };
  }, []);

  const riskLevel = status?.riskLevel ?? 'LOW';

  const postureStyles: Record<string, any> = {
    LOW: {
      label: t('status_normal', 'BÌNH THƯỜNG'),
      bg: 'bg-emerald-50/80 border-emerald-100',
      text: 'text-emerald-700',
      sub: t('status_normal_desc', 'Hệ thống đang hoạt động an toàn'),
      glow: ['0 0 0 rgba(16,185,129,0)', '0 0 16px rgba(16,185,129,0.15)', '0 0 0 rgba(16,185,129,0)']
    },
    MEDIUM: {
      label: t('status_warning', 'CẢNH BÁO'),
      bg: 'bg-amber-50/80 border-amber-100',
      text: 'text-amber-700',
      sub: t('status_warning_desc', 'Cảnh báo nguy cơ mức độ trung bình'),
      glow: ['0 0 0 rgba(245,158,11,0)', '0 0 20px rgba(245,158,11,0.2)', '0 0 0 rgba(245,158,11,0)']
    },
    HIGH: {
      label: t('status_danger', 'NGUY HIỂM'),
      bg: 'bg-orange-50/80 border-orange-100',
      text: 'text-orange-700',
      sub: t('status_danger_desc', 'Phát hiện nguy cơ cháy nổ cao'),
      glow: ['0 0 0 rgba(239,68,68,0)', '0 0 32px rgba(239,68,68,0.22)', '0 0 0 rgba(239,68,68,0)']
    },
    CRITICAL: {
      label: t('status_critical', 'NGHIÊM TRỌNG'),
      bg: 'bg-red-950/90 border-red-900',
      text: 'text-red-200',
      sub: t('status_critical_desc', 'NGUY HIỂM! Phát hiện cháy và người gặp nạn'),
      glow: ['0 0 0 rgba(220,38,38,0)', '0 0 40px rgba(220,38,38,0.45)', '0 0 0 rgba(220,38,38,0)']
    }
  };

  const posture = postureStyles[riskLevel];
  const isDanger = riskLevel === 'HIGH' || riskLevel === 'CRITICAL';

  const dynamicMetrics = [
    { 
      label: t('stat_fire_conf', 'Tỉ lệ Lửa (Fire Confidence)'), 
      value: status?.riskScore && status.riskLevel !== 'LOW' ? `${Math.round(status.riskScore)}%` : '0%', 
      trend: status?.riskLevel !== 'LOW' ? t('stat_hazard_detected', 'phát hiện nguy hiểm') : t('stat_stable', 'hoạt động ổn định'), 
      icon: Flame, 
      color: isDanger ? 'text-red-600' : 'text-slate-500', 
      bg: isDanger ? 'bg-red-50' : 'bg-slate-100' 
    },
    { 
      label: t('stat_smoke_dens', 'Mật độ Khói (Smoke Density)'), 
      value: riskLevel === 'CRITICAL' ? '82%' : riskLevel === 'HIGH' ? '65%' : riskLevel === 'MEDIUM' ? '25%' : '0%', 
      trend: riskLevel !== 'LOW' ? t('stat_spread', 'lan toả') : t('stat_no_smoke', 'không có khói'), 
      icon: Cloud, 
      color: 'text-slate-600', 
      bg: 'bg-slate-100' 
    },
    { 
      label: t('stat_human_nearby', 'Người xung quanh (Humans Nearby)'), 
      value: status?.humanAtRisk ? '01' : '00', 
      trend: status?.humanAtRisk ? t('stat_human_risk', '1 người vùng nguy hiểm') : t('stat_safe', 'an toàn'), 
      icon: Users, 
      color: status?.humanAtRisk ? 'text-amber-600' : 'text-slate-500', 
      bg: status?.humanAtRisk ? 'bg-amber-50' : 'bg-slate-100' 
    },
    { 
      label: t('stat_ai_latency', 'Độ trễ AI (AI Latency)'), 
      value: status ? '31ms' : '--', 
      trend: 'realtime active', 
      icon: Activity, 
      color: 'text-cyan-600', 
      bg: 'bg-cyan-50' 
    }
  ];

  const hasLiveFrame = primaryStream.frame && primaryStream.state === 'connected';
  const imageSrc = hasLiveFrame ? `data:image/jpeg;base64,${primaryStream.frame!.frame}` : null;

  async function handleTriggerTest(level: 'LOW' | 'CRITICAL') {
    setTestLoading(true);
    try {
      if (level === 'CRITICAL') {
        await triggerMockEmergency({
          cameraId: 'webcam-0',
          riskLevel: 'CRITICAL',
          riskScore: 95.0,
          humanAtRisk: true,
          message: 'Mô phỏng cháy khẩn cấp từ Dashboard UI'
        });
      } else {
        await triggerMockEmergency({
          cameraId: 'webcam-0',
          riskLevel: 'LOW',
          riskScore: 0.0,
          humanAtRisk: false,
          message: 'Khôi phục trạng thái an toàn'
        });
      }
      // Reload data immediately
      const currentStatus = await getEmergencyStatus();
      const timeline = await getIncidentTimeline();
      setStatus(currentStatus);
      setTimelineEvents(timeline.slice(0, 4));
    } catch {
      alert('Không thể thực hiện mô phỏng.');
    } finally {
      setTestLoading(false);
    }
  }

  return (
    <CinematicShell riskLevel={riskLevel}>
      <motion.div
        className="min-h-screen space-y-6 rounded-[28px] bg-[radial-gradient(circle_at_top_left,#e0f2fe_0,#f8fafc_34%,#ffffff_100%)] p-1"
        initial="hidden"
        animate="show"
        transition={{ staggerChildren: 0.08 }}
      >
      <motion.header variants={variants} className="cinematic-card overflow-hidden rounded-2xl border border-white/80 bg-white/75 p-6 shadow-[0_24px_80px_rgba(15,23,42,0.08)] backdrop-blur-xl">
        <div className="flex flex-wrap items-start justify-between gap-5">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-cyan-200 bg-cyan-50 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-cyan-700">
              <Radio size={14} />
              PhoenixVision
            </div>
            <h1 className="mt-4 max-w-3xl text-4xl font-semibold tracking-tight text-slate-950">
              {t('dash_title', 'Bảng Thống kê Cảnh báo cháy sớm AI')}
            </h1>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-600">
              {t('dash_subtitle', 'Giám sát theo thời gian thực, đánh giá mức độ rủi ro, theo dõi tình trạng khẩn cấp và xem lại lịch sử các sự kiện dành cho ban quản lý toà nhà.')}
            </p>
          </div>
          <div className="flex flex-col gap-3 items-end">
            <motion.div
              className={`rounded-2xl border px-5 py-4 text-right shadow-sm ${posture.bg}`}
              animate={{ boxShadow: posture.glow }}
              transition={{ duration: 1.8, repeat: Infinity, ease: 'easeInOut' }}
            >
              <p className={`text-xs font-semibold uppercase tracking-[0.16em] ${posture.text}`}>{t('dash_current_posture', 'Trạng thái hiện tại')}</p>
              <p className={`mt-1 text-3xl font-semibold ${posture.text}`}>{posture.label}</p>
              <p className={`mt-1 text-xs ${posture.text}`}>{posture.sub}</p>
            </motion.div>
            
            <div className="flex gap-2">
              <button
                type="button"
                disabled={testLoading}
                onClick={() => handleTriggerTest('CRITICAL')}
                className="inline-flex items-center gap-1.5 rounded-xl bg-red-600 px-3 py-2 text-xs font-bold uppercase tracking-wider text-white shadow-md shadow-red-600/20 transition hover:bg-red-700 hover:-translate-y-0.5 active:scale-95 disabled:opacity-50"
              >
                <Flame size={14} /> {t('dash_trigger_alert', 'Báo cháy')}
              </button>
              
              <button
                type="button"
                disabled={testLoading}
                onClick={() => handleTriggerTest('LOW')}
                className="inline-flex items-center gap-1.5 rounded-xl bg-slate-800 px-3 py-2 text-xs font-bold uppercase tracking-wider text-white shadow-md transition hover:bg-slate-900 hover:-translate-y-0.5 active:scale-95 disabled:opacity-50"
              >
                <ShieldAlert size={14} /> {t('dash_reset_safe', 'Trở về An toàn')}
              </button>
            </div>
          </div>
        </div>
      </motion.header>

      <motion.div variants={variants}>
        <EmergencyPanel compact />
      </motion.div>

      <motion.section variants={variants} className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {dynamicMetrics.map((metric) => (
          <MetricCard key={metric.label} {...metric} />
        ))}
      </motion.section>

      <section className="grid gap-6 xl:grid-cols-[1.65fr_0.95fr]">
        <motion.div variants={variants} className="cinematic-card rounded-2xl border border-white/80 bg-white/75 p-5 shadow-[0_24px_80px_rgba(15,23,42,0.08)] backdrop-blur-xl">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="flex items-center gap-2 text-lg font-semibold text-slate-950">
                <Camera size={20} className="text-cyan-600" />
                {t('dash_camera_feed', 'Dữ liệu Camera thời gian thực')}
              </h2>
              <p className="text-sm text-slate-500">Camera A01 - Sảnh chính</p>
            </div>
            <div className="flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700">
              <span className="h-2 w-2 rounded-full bg-emerald-500 shadow-[0_0_12px_rgba(16,185,129,0.9)]" />
              {hasLiveFrame ? t('dash_live', 'TRỰC TIẾP') : 'STANDBY DEMO'}
            </div>
          </div>

          <div className="camera-corners relative aspect-video overflow-hidden rounded-xl border border-slate-200 bg-slate-950 shadow-inner">
            {imageSrc ? (
              <img src={imageSrc} alt="Webcam livestream" className="h-full w-full object-cover" />
            ) : (
              <>
                <div className="absolute inset-0 bg-[linear-gradient(120deg,rgba(14,165,233,0.18),transparent_35%,rgba(239,68,68,0.20))]" />
                <div className="absolute inset-x-0 top-0 h-14 bg-gradient-to-b from-slate-950/80 to-transparent" />
                <div className="absolute left-[18%] top-[28%] h-[28%] w-[18%] rounded-md border-2 border-red-500 shadow-[0_0_24px_rgba(239,68,68,0.75)]">
                  <DangerBeacon tone="danger">
                    <Label text="fire 0.88" tone="danger" />
                  </DangerBeacon>
                </div>
                <div className="absolute left-[48%] top-[18%] h-[34%] w-[26%] rounded-md border-2 border-slate-300 shadow-[0_0_24px_rgba(148,163,184,0.55)]">
                  <DangerBeacon tone="neutral">
                    <Label text="smoke 0.79" tone="smoke" />
                  </DangerBeacon>
                </div>
                <div className="absolute bottom-[18%] right-[22%] h-[42%] w-[14%] rounded-md border-2 border-amber-400 shadow-[0_0_24px_rgba(245,158,11,0.75)]">
                  <DangerBeacon tone="warning">
                    <Label text="person" tone="warning" />
                  </DangerBeacon>
                </div>
              </>
            )}
            
            <CameraOverlay danger={isDanger} />
            
            <div className={`absolute bottom-5 left-5 rounded-lg border border-white/15 bg-slate-950/80 px-4 py-3 text-white backdrop-blur shadow-lg`}>
              <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-cyan-200">
                {status?.humanAtRisk ? t('dash_danger_zone', 'KHU VỰC NGUY HIỂM') : t('dash_sys_status', 'TRẠNG THÁI HỆ THỐNG')}
              </p>
              <p className="mt-1 text-sm font-semibold">
                {status?.humanAtRisk 
                  ? t('dash_human_danger', 'Phát hiện có người trong khu vực cháy') 
                  : riskLevel === 'CRITICAL' 
                  ? t('dash_fire_evacuate', 'CHÁY LỚN CẦN SƠ TÁN KHẨN CẤP') 
                  : riskLevel === 'HIGH' 
                  ? t('dash_high_risk', 'Phát hiện nguy cơ cháy nổ cao') 
                  : t('dash_normal', 'Hoạt động bình thường - An toàn')}
              </p>
            </div>
          </div>
        </motion.div>

        <motion.aside variants={variants} className="space-y-6">
          <RiskGauge score={status?.riskScore ?? 0} riskLevel={riskLevel} humanAtRisk={status?.humanAtRisk} />
          <IncidentMiniTimeline events={timelineEvents} />
        </motion.aside>
      </section>

      <motion.section variants={variants} className="grid gap-6 lg:grid-cols-3">
        <AlertCard 
          title={t('dash_alerts_title', 'Thông báo Khẩn cấp')} 
          value={status?.escalationCount ? String(status.escalationCount).padStart(2, '0') : '00'} 
          icon={Siren} 
          tone={isDanger ? 'red' : 'cyan'} 
          description={isDanger ? t('dash_alerts_desc_danger', 'Có các cảnh báo chưa được xử lý.') : t('dash_alerts_desc_safe', 'Không có báo động mới.')} 
        />
        <AlertCard title={t('dash_evidence_title', 'Bằng chứng Camera')} value={status?.snapshotUrl ? '01' : '00'} icon={Camera} tone="cyan" description={t('dash_evidence_desc', 'Hình ảnh tự động cắt từ camera giám sát.')} />
        <AlertCard 
          title={t('dash_integrity_title', 'Hoạt động hệ thống')} 
          value={status ? '99.9%' : 'OFFLINE'} 
          icon={ShieldAlert} 
          tone={status ? 'emerald' : 'red'} 
          description={status ? t('dash_integrity_desc_on', 'Camera stream, Server và hệ thống AI vẫn đang hoạt động tốt.') : t('dash_integrity_desc_off', 'Đã mất kết nối server.')} 
        />
      </motion.section>
      
      {error ? <p className="mt-3 text-center text-sm font-medium text-red-600">{error}</p> : null}
      </motion.div>
    </CinematicShell>
  );
}

interface MetricCardProps {
  label: string;
  value: string;
  trend: string;
  icon: React.ComponentType<{ size?: number; className?: string }>;
  color: string;
  bg: string;
}

function MetricCard({ label, value, trend, icon: Icon, color, bg }: MetricCardProps) {
  return (
    <motion.div variants={variants} whileHover={{ y: -4, scale: 1.01 }} transition={{ type: 'spring', stiffness: 260, damping: 18 }} className="cinematic-card rounded-2xl border border-white/80 bg-white/80 p-5 shadow-sm backdrop-blur-xl">
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

function RiskGauge({ score, riskLevel, humanAtRisk }: { score: number; riskLevel: string; humanAtRisk?: boolean }) {
  const { t } = useTranslation();
  return (
    <div className="rounded-2xl border border-white/80 bg-white/80 p-5 shadow-sm backdrop-blur-xl">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-slate-950">{t('dash_risk_gauge_title', 'Biểu đồ rủi ro')}</h2>
          <p className="text-sm text-slate-500">{t('dash_risk_gauge_desc', 'Đánh giá dựa trên diện tích, thời lượng và số người.')}</p>
        </div>
        <AlertTriangle className={riskLevel !== 'LOW' ? 'text-red-500 animate-pulse' : 'text-slate-400'} size={22} />
      </div>
      <RiskPulseRing score={Math.round(score)} />
      <div className="mt-5 grid grid-cols-3 gap-2 text-center text-xs">
        <div className={`rounded-lg p-2 ${riskLevel !== 'LOW' ? 'bg-red-50 text-red-700 font-semibold' : 'bg-slate-50 text-slate-500'}`}>
          {t('stat_fire', 'Lửa')} {score > 0 ? `${Math.round(score)}%` : '0%'}
        </div>
        <div className={`rounded-lg p-2 ${humanAtRisk ? 'bg-amber-50 text-amber-700 font-semibold animate-pulse' : 'bg-slate-50 text-slate-500'}`}>
          {t('stat_human', 'Người')} {humanAtRisk ? '1' : '0'}
        </div>
        <div className="rounded-lg bg-cyan-50 p-2 text-cyan-700">{t('stat_consistency', 'Ổn định')} 91%</div>
      </div>
    </div>
  );
}

function IncidentMiniTimeline({ events }: { events: IncidentTimelineEvent[] }) {
  const { t } = useTranslation();
  return (
    <div className="rounded-2xl border border-white/80 bg-white/80 p-5 shadow-sm backdrop-blur-xl">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-lg font-semibold text-slate-950">{t('dash_timeline_title', 'Dòng sự kiện')}</h2>
        <span className="rounded-full bg-cyan-50 px-2 py-1 text-xs font-semibold text-cyan-700">realtime</span>
      </div>
      <div className="space-y-3">
        {events.length ? (
          events.map((item) => {
            const timeStr = new Date(item.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
            return (
              <motion.div key={item.id} whileHover={{ x: 4 }} className="flex gap-3 rounded-xl border border-slate-100 bg-slate-50/80 p-3">
                <motion.div
                  className={`mt-1 h-3 w-3 rounded-full ${item.riskLevel === 'CRITICAL' ? 'bg-fuchsia-600' : item.riskLevel === 'HIGH' ? 'bg-red-500' : item.riskLevel === 'MEDIUM' ? 'bg-amber-400' : 'bg-emerald-400'}`}
                  animate={{ scale: [1, 1.35, 1], opacity: [0.7, 1, 0.7] }}
                  transition={{ duration: item.riskLevel === 'CRITICAL' ? 0.9 : 1.6, repeat: Infinity, ease: 'easeInOut' }}
                />
                <div>
                  <p className="text-xs text-slate-400">{timeStr}</p>
                  <p className="text-sm font-semibold text-slate-900">{item.title}</p>
                  <p className="text-xs text-slate-500">{item.description}</p>
                </div>
              </motion.div>
            );
          })
        ) : (
          <p className="text-sm text-slate-500 py-4 text-center">{t('dash_timeline_empty', 'Chưa có sự kiện timeline nào được ghi nhận.')}</p>
        )}
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
    <motion.div variants={variants} whileHover={{ y: -4, scale: 1.01 }} transition={{ type: 'spring', stiffness: 260, damping: 18 }} className="cinematic-card rounded-2xl border border-white/80 bg-white/80 p-5 shadow-sm backdrop-blur-xl">
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
