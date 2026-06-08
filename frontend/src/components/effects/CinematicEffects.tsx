import { AnimatePresence, motion } from 'framer-motion';
import type { ReactNode } from 'react';

type RiskLevel = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

const highRiskLevels = new Set<RiskLevel>(['HIGH', 'CRITICAL']);

export function CinematicShell({ children, riskLevel = 'HIGH' }: { children: ReactNode; riskLevel?: RiskLevel }) {
  const isHighRisk = highRiskLevels.has(riskLevel);

  return (
    <div className="relative overflow-hidden">
      <div className="pointer-events-none absolute inset-0 rounded-[28px] bg-[radial-gradient(circle_at_84%_12%,rgba(239,68,68,0.12),transparent_28%),radial-gradient(circle_at_12%_22%,rgba(6,182,212,0.18),transparent_32%)]" />
      <div className="pointer-events-none absolute inset-0 cinematic-grid opacity-60" />
      <AnimatePresence>{isHighRisk ? <EmergencyOverlay key="emergency-overlay" /> : null}</AnimatePresence>
      <div className="relative">{children}</div>
    </div>
  );
}

export function EmergencyOverlay() {
  return (
    <motion.div
      className="pointer-events-none absolute inset-0 z-0 rounded-[28px] border border-red-200/70"
      initial={{ opacity: 0 }}
      animate={{ opacity: [0.18, 0.42, 0.18] }}
      exit={{ opacity: 0 }}
      transition={{ duration: 1.6, repeat: Infinity, ease: 'easeInOut' }}
    >
      <div className="absolute inset-x-0 top-0 h-24 bg-gradient-to-b from-red-500/18 to-transparent" />
      <div className="absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-red-500/12 to-transparent" />
      <motion.div
        className="absolute inset-y-0 left-0 w-1/3 bg-gradient-to-r from-red-500/12 to-transparent"
        animate={{ x: ['-120%', '320%'] }}
        transition={{ duration: 3.4, repeat: Infinity, ease: 'linear' }}
      />
    </motion.div>
  );
}

export function CameraOverlay({ danger = true }: { danger?: boolean }) {
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden rounded-xl">
      <div className="absolute inset-0 camera-vignette" />
      <div className="absolute inset-0 camera-scanlines opacity-35" />
      <motion.div
        className={`absolute inset-x-0 h-20 ${danger ? 'bg-gradient-to-b from-red-400/20 via-cyan-200/20 to-transparent' : 'bg-gradient-to-b from-cyan-300/20 to-transparent'}`}
        animate={{ y: ['-20%', '520%'] }}
        transition={{ duration: 2.8, repeat: Infinity, ease: 'linear' }}
      />
      <div className="absolute left-4 right-4 top-4 flex items-center justify-between text-[10px] font-semibold uppercase tracking-[0.18em] text-white/80">
        <span>AI VISION ACTIVE</span>
        <span>{danger ? 'RISK LOCK' : 'SCANNING'}</span>
      </div>
      <div className="absolute bottom-4 left-4 right-4 h-px bg-gradient-to-r from-transparent via-cyan-200/70 to-transparent" />
    </div>
  );
}

export function DangerBeacon({ children, tone = 'danger' }: { children: ReactNode; tone?: 'danger' | 'warning' | 'neutral' }) {
  const glow = {
    danger: 'shadow-[0_0_30px_rgba(239,68,68,0.75)]',
    warning: 'shadow-[0_0_28px_rgba(245,158,11,0.7)]',
    neutral: 'shadow-[0_0_24px_rgba(148,163,184,0.55)]'
  }[tone];

  return (
    <motion.div
      className={`absolute inset-0 rounded-md ${glow}`}
      animate={{ scale: [1, 1.025, 1], opacity: [0.82, 1, 0.82] }}
      transition={{ duration: tone === 'danger' ? 1.05 : 1.6, repeat: Infinity, ease: 'easeInOut' }}
    >
      <motion.div
        className="absolute -inset-2 rounded-lg border border-current opacity-40"
        animate={{ scale: [1, 1.12], opacity: [0.45, 0] }}
        transition={{ duration: 1.4, repeat: Infinity, ease: 'easeOut' }}
      />
      {children}
    </motion.div>
  );
}

export function RiskPulseRing({ score = 72 }: { score?: number }) {
  const clampedScore = Math.max(0, Math.min(score, 100));

  return (
    <div className="relative mx-auto mt-6 grid h-52 w-52 place-items-center">
      <motion.div
        className="absolute inset-0 rounded-full border border-red-300/70"
        animate={{ scale: [0.96, 1.08], opacity: [0.65, 0] }}
        transition={{ duration: 1.4, repeat: Infinity, ease: 'easeOut' }}
      />
      <motion.div
        className="absolute inset-4 rounded-full border border-orange-300/70"
        animate={{ scale: [0.96, 1.12], opacity: [0.5, 0] }}
        transition={{ duration: 1.8, repeat: Infinity, ease: 'easeOut', delay: 0.2 }}
      />
      <motion.div
        className="relative grid h-full w-full place-items-center rounded-full p-4 shadow-[0_18px_70px_rgba(239,68,68,0.22)]"
        style={{ background: `conic-gradient(#ef4444 0 ${clampedScore}%, #e2e8f0 ${clampedScore}% 100%)` }}
        animate={{ rotate: [0, 0.3, 0] }}
        transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
      >
        <div className="grid h-full w-full place-items-center rounded-full bg-white text-center shadow-inner">
          <div>
            <p className="text-5xl font-semibold text-slate-950">{score}</p>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-red-500">High Risk</p>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
