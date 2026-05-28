import { ChevronLeft, ChevronRight, Flame, History, LayoutDashboard, Siren } from 'lucide-react';
import type { MouseEvent } from 'react';
import { useState } from 'react';
import { NavLink, Outlet } from 'react-router-dom';

const navItems = [
  { to: '/', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/live', label: 'Live Detection', icon: Flame },
  { to: '/history', label: 'History', icon: History },
  { to: '/alerts', label: 'Alerts', icon: Siren }
];

export function AppLayout() {
  const [collapsed, setCollapsed] = useState(false);
  const [toggleTop, setToggleTop] = useState(44);

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
            src={collapsed ? '/PhoenixLogoOnly.png' : '/PhoenixLogoLandscape.png'}
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
      </aside>
      <main className={`transition-all duration-300 ${collapsed ? 'md:pl-20' : 'md:pl-64'}`}>
        <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
