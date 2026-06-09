import { ChevronLeft, ChevronRight, Flame, History, LayoutDashboard, LogOut, Siren, X, AlertTriangle } from 'lucide-react';
import type { MouseEvent } from 'react';
import { useState, useEffect } from 'react';
import { NavLink, Outlet } from 'react-router-dom';
import { useAuth } from '../../features/auth/AuthContext';
import { useCameraMonitoring } from '../../features/detection/CameraMonitoringContext';
import { publicAsset } from '../../lib/assets';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { useEmergencyTone } from '../../hooks/useEmergencyTone';

const navItems = [
  { to: '/', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/live', label: 'Live Detection', icon: Flame },
  { to: '/history', label: 'History', icon: History },
  { to: '/alerts', label: 'Alerts', icon: Siren }
];

export function AppLayout() {
  const { user, logout } = useAuth();
  const [collapsed, setCollapsed] = useState(false);
  const [toggleTop, setToggleTop] = useState(44);

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
        className={`group fixed inset-y-0 left-0 hidden border-r border-slate-200 bg-white px-4 py-6 transition-all duration-300 md:block ${
          collapsed ? 'w-20' : 'w-64'
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

        <div className={`mb-8 flex ${collapsed ? 'justify-center px-0' : 'px-2'}`}>
          <img
            src={publicAsset(collapsed ? 'PhoenixLogoOnly.png' : 'PhoenixLogoLandscape.png')}
            alt="PhoenixVision"
            className={`${collapsed ? 'h-11 w-11 rounded-xl object-contain' : 'h-12 w-auto object-contain'} transition-all duration-300`}
          />
        </div>
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
              <item.icon size={collapsed ? 20 : 18} />
              {!collapsed ? <span>{item.label}</span> : null}
            </NavLink>
          ))}
        </nav>

        <div className="absolute inset-x-4 bottom-5">
          {!collapsed ? (
            <div className="mb-3 rounded-2xl border border-slate-200 bg-slate-50 p-3">
              <p className="truncate text-xs font-semibold text-slate-500">Tài khoản</p>
              <p className="mt-1 truncate text-sm font-semibold text-slate-900">{user?.email}</p>
            </div>
          ) : null}
          <button
            type="button"
            onClick={() => logout()}
            title={collapsed ? 'Đăng xuất' : undefined}
            className={`flex w-full items-center rounded-md py-2 text-sm font-medium text-slate-600 transition hover:bg-slate-100 ${
              collapsed ? 'justify-center px-0' : 'gap-3 px-3'
            }`}
          >
            <LogOut size={collapsed ? 20 : 18} />
            {!collapsed ? <span>Đăng xuất</span> : null}
          </button>
        </div>
      </aside>
      <main className={`transition-all duration-300 ${collapsed ? 'md:pl-20' : 'md:pl-64'}`}>
        <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
          <Outlet />
        </div>
      </main>

      {/* Floating In-App Toasts */}
      {createPortal(
        <div className="fixed right-5 top-5 z-[9999] flex flex-col gap-3 w-80 pointer-events-none">
          <AnimatePresence>
            {toasts.map(toast => (
              <motion.div
                key={toast.id}
                initial={{ opacity: 0, x: 50, scale: 0.9 }}
                animate={{ opacity: 1, x: 0, scale: 1 }}
                exit={{ opacity: 0, x: 50, scale: 0.95 }}
                className={`pointer-events-auto flex flex-col gap-1 rounded-2xl border p-4 shadow-xl backdrop-blur-md ${
                  toast.state === 'critical'
                    ? 'border-red-500 bg-red-950/95 text-white'
                    : toast.state === 'emergency'
                    ? 'border-orange-500 bg-orange-950/95 text-white'
                    : 'border-amber-400 bg-amber-950/95 text-white'
                }`}
              >
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    {toast.state === 'critical' ? (
                      <Flame size={16} className="text-red-400 animate-pulse shrink-0" />
                    ) : toast.state === 'emergency' ? (
                      <Siren size={16} className="text-orange-400 shrink-0" />
                    ) : (
                      <AlertTriangle size={16} className="text-amber-400 shrink-0" />
                    )}
                    <span className="font-bold text-sm tracking-wide">{toast.title}</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => dismissToast(toast.id)}
                    className="rounded-lg p-1 text-white/60 hover:bg-white/10 hover:text-white transition"
                  >
                    <X size={14} />
                  </button>
                </div>
                <p className="text-xs text-white/80 leading-relaxed">{toast.body}</p>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>,
        document.body
      )}
    </div>
  );
}
