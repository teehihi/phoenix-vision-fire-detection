import {
  AlertTriangle,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Flame,
  History,
  LayoutDashboard,
  LogOut,
  Siren,
  X,
  Settings
} from 'lucide-react';
import type { MouseEvent } from 'react';
import { useState, useEffect } from 'react';
import { NavLink, Outlet } from 'react-router-dom';
import { useAuth } from '../../features/auth/AuthContext';
import {
  useCameraMonitoring,
  type MonitoringToast
} from '../../features/detection/CameraMonitoringContext';
import { publicAsset } from '../../lib/assets';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { useEmergencyTone } from '../../hooks/useEmergencyTone';
import { useTranslation } from '../../lib/i18n';

export function AppLayout() {
  const { user, logout } = useAuth();
  const { t } = useTranslation();
  const [collapsed, setCollapsed] = useState(false);
  const [toggleTop, setToggleTop] = useState(44);

  const navItems = [
    { to: '/', label: t('nav_dashboard', 'Quản lý Camera'), icon: LayoutDashboard },
    { to: '/statistics', label: t('nav_statistics', 'Thống kê'), icon: Flame },
    { to: '/history', label: t('nav_history', 'Lịch sử'), icon: History },
    { to: '/alerts', label: t('nav_alerts', 'Cảnh báo'), icon: Siren }
  ];

  const { toasts, dismissToast, highestEmergencyState } = useCameraMonitoring();
  const [soundEnabled, setSoundEnabled] = useState(() => {
    return localStorage.getItem('soundEnabled') !== 'false';
  });

  useEffect(() => {
    const handleSoundChanged = () => {
      setSoundEnabled(localStorage.getItem('soundEnabled') !== 'false');
    };
    window.addEventListener('sound-enabled-changed', handleSoundChanged);
    return () => window.removeEventListener('sound-enabled-changed', handleSoundChanged);
  }, []);

  useEmergencyTone(highestEmergencyState, soundEnabled);

  function handleSidebarMouseMove(event: MouseEvent<HTMLElement>) {
    const rect = event.currentTarget.getBoundingClientRect();
    const nextTop = Math.min(Math.max(event.clientY - rect.top, 36), rect.height - 36);
    setToggleTop(nextTop);
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <aside
        onMouseMove={handleSidebarMouseMove}
        className={`group fixed inset-y-0 left-0 hidden flex-col border-r border-slate-200 bg-white pb-4 pt-6 transition-all duration-300 md:flex ${
          collapsed ? 'w-20 px-4' : 'w-72 px-5'
        }`}
      >
        <button
          type="button"
          onClick={() => setCollapsed((value) => !value)}
          style={{ top: toggleTop }}
          className="absolute -right-3 z-20 grid h-9 w-9 -translate-y-1/2 place-items-center rounded-full border border-slate-200 bg-white text-slate-600 opacity-0 shadow-md transition hover:bg-slate-50 group-hover:opacity-100"
          aria-label={collapsed ? 'Mở rộng sidebar' : 'Thu nhỏ sidebar'}
        >
          {collapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
        </button>

        <div className={`mb-8 flex shrink-0 ${collapsed ? 'justify-center px-0' : 'px-2'}`}>
          <img
            src={publicAsset(collapsed ? 'PhoenixLogoOnly.png' : 'PhoenixLogoLandscape.png')}
            alt="PhoenixVision"
            className={`${collapsed ? 'h-11 w-11 rounded-xl object-contain' : 'h-12 w-auto object-contain'} transition-all duration-300`}
          />
        </div>
        
        <div className="flex flex-1 flex-col justify-between overflow-y-auto overflow-x-hidden">
          <nav className="space-y-1">
            {navItems.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                title={collapsed ? item.label : undefined}
                className={({ isActive }) =>
                  `flex items-center rounded-md py-2 text-sm font-medium transition ${
                    collapsed ? 'justify-center px-0' : 'gap-3 px-3'
                  } ${
                    isActive ? 'bg-brand-50 text-brand-700' : 'text-slate-600 hover:bg-slate-100'
                  }`
                }
              >
                <item.icon size={collapsed ? 20 : 18} className="shrink-0" />
                {!collapsed ? <span>{item.label}</span> : null}
              </NavLink>
            ))}
          </nav>

          <div className="mt-8 space-y-5">
            {!collapsed ? (
              <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4 text-[15px] leading-7 text-slate-500">
                <p className="mb-2 text-[13px] font-semibold uppercase tracking-wide text-orange-600">Thông tin Đề tài</p>
                <p className="mb-3 text-[17px] font-semibold leading-7 text-slate-700">{t('project_title', 'Xây dựng hệ thống cảnh báo cháy thông minh sử dụng YOLO và xử lý ảnh thời gian thực')}</p>
                <p className="text-[15px] font-bold text-slate-600">{t('project_group', 'Nhóm 9')}</p>
                <ul className="mb-3 mt-1 space-y-1 text-[14px] text-slate-600">
                  <li>Nguyễn Nhật Thiên - 23110153</li>
                  <li>Phạm Văn Hậu - 23110098</li>
                  <li>Trương Công Anh - 23110075</li>
                </ul>
                <p className="border-t border-slate-200 pt-2 text-[14px] font-semibold text-slate-600">{t('project_advisor', 'GVHD: PGS.TS Hoàng Văn Dũng')}</p>
              </div>
            ) : null}

            <div className="space-y-1">
              {!collapsed ? (
                <div className="mb-3 rounded-2xl border border-slate-200 bg-slate-50 p-3">
                  <p className="truncate text-xs font-bold uppercase tracking-wider text-slate-500">{t('account', 'XIN CHÀO')}</p>
                  <p className="mt-1 truncate text-sm font-semibold text-slate-900">{user?.displayName || user?.email}</p>
                </div>
              ) : null}
              
              <NavLink
                to="/settings"
                title={collapsed ? t('nav_settings', 'Cài đặt') : undefined}
                className={({ isActive }) =>
                  `flex w-full items-center rounded-md py-2 text-sm font-medium transition ${
                    collapsed ? 'justify-center px-0' : 'gap-3 px-3'
                  } ${
                    isActive ? 'bg-brand-50 text-brand-700' : 'text-slate-600 hover:bg-slate-100'
                  }`
                }
              >
                <Settings size={collapsed ? 20 : 18} className="shrink-0" />
                {!collapsed ? <span>{t('nav_settings', 'Cài đặt')}</span> : null}
              </NavLink>

              <button
                type="button"
                onClick={() => logout()}
                title={collapsed ? t('nav_logout', 'Đăng xuất') : undefined}
                className={`flex w-full items-center rounded-md py-2 text-sm font-medium text-slate-600 transition hover:bg-red-50 hover:text-red-600 ${
                  collapsed ? 'justify-center px-0' : 'gap-3 px-3'
                }`}
              >
                <LogOut size={collapsed ? 20 : 18} className="shrink-0" />
                {!collapsed ? <span>{t('nav_logout', 'Đăng xuất')}</span> : null}
              </button>
            </div>
          </div>
        </div>
      </aside>
      <main className={`transition-all duration-300 ${collapsed ? 'md:pl-20' : 'md:pl-72'}`}>
        <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
          <Outlet />
        </div>
      </main>

      {createPortal(
        <div className="pointer-events-none fixed bottom-5 right-5 z-[90] flex w-[min(22rem,calc(100vw-2rem))] flex-col-reverse items-end gap-2">
          <AnimatePresence>
            {toasts.map(toast => (
              <MonitoringToastCard
                key={toast.id}
                toast={toast}
                onDismiss={dismissToast}
              />
            ))}
          </AnimatePresence>
        </div>,
        document.body
      )}
    </div>
  );
}

function MonitoringToastCard({
  toast,
  onDismiss
}: {
  toast: MonitoringToast;
  onDismiss: (toastId: string) => void;
}) {
  const [expanded, setExpanded] = useState(true);

  useEffect(() => {
    setExpanded(true);
    const collapseTimer = window.setTimeout(() => setExpanded(false), 4500);
    return () => window.clearTimeout(collapseTimer);
  }, [toast.id, toast.state]);

  const tone = toast.state === 'critical'
    ? 'border-red-500 bg-red-950/95'
    : toast.state === 'emergency'
      ? 'border-orange-500 bg-orange-950/95'
      : 'border-amber-400 bg-amber-950/95';

  const icon = toast.state === 'critical'
    ? <Flame size={16} className="shrink-0 animate-pulse text-red-400" />
    : toast.state === 'emergency'
      ? <Siren size={16} className="shrink-0 text-orange-400" />
      : <AlertTriangle size={16} className="shrink-0 text-amber-400" />;

  return (
    <motion.div
      layout
      initial={{ opacity: 0, x: 40, scale: 0.92 }}
      animate={{ opacity: 1, x: 0, scale: 1 }}
      exit={{ opacity: 0, x: 40, scale: 0.95 }}
      className={`pointer-events-auto overflow-hidden rounded-2xl border text-white shadow-xl backdrop-blur-md ${tone} ${
        expanded ? 'w-full' : 'w-auto max-w-full'
      }`}
    >
      {expanded ? (
        <div className="flex items-center gap-2 p-4">
          {icon}
          <p className="min-w-0 flex-1 text-sm font-semibold leading-5">{toast.body}</p>
          <button
            type="button"
            onClick={() => setExpanded(false)}
            className="shrink-0 rounded-lg p-1 text-white/60 transition hover:bg-white/10 hover:text-white"
            aria-label="Thu gọn cảnh báo"
          >
            <ChevronDown size={14} />
          </button>
          <button
            type="button"
            onClick={() => onDismiss(toast.id)}
            className="shrink-0 rounded-lg p-1 text-white/60 transition hover:bg-white/10 hover:text-white"
            aria-label="Ẩn cảnh báo"
          >
            <X size={14} />
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setExpanded(true)}
          className="flex max-w-full items-center gap-2 px-3 py-2.5 text-left transition hover:bg-white/10"
          aria-label={`Mở cảnh báo ${toast.cameraLabel}`}
        >
          {icon}
          <span className="max-w-32 truncate text-sm font-semibold">{toast.cameraLabel}</span>
          <span className="rounded-full bg-white/15 px-2 py-0.5 text-[11px] font-bold">
            {toast.riskLevel}
          </span>
          <span className="whitespace-nowrap text-sm font-bold">{toast.riskScore}/100</span>
        </button>
      )}
    </motion.div>
  );
}
