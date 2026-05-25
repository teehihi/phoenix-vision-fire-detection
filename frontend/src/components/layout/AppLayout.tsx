import { Flame, History, LayoutDashboard, Siren } from 'lucide-react';
import { NavLink, Outlet } from 'react-router-dom';

const navItems = [
  { to: '/', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/live', label: 'Live Detection', icon: Flame },
  { to: '/history', label: 'History', icon: History },
  { to: '/alerts', label: 'Alerts', icon: Siren }
];

export function AppLayout() {
  return (
    <div className="min-h-screen bg-slate-50">
      <aside className="fixed inset-y-0 left-0 hidden w-64 border-r border-slate-200 bg-white px-4 py-6 md:block">
        <div className="mb-8 flex items-center gap-3 px-2">
          <div className="rounded-lg bg-brand-600 p-2 text-white">
            <Flame size={20} />
          </div>
          <div>
            <p className="text-sm font-semibold text-slate-900">FireWatch AI</p>
            <p className="text-xs text-slate-500">Realtime safety dashboard</p>
          </div>
        </div>
        <nav className="space-y-1">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                `flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium ${
                  isActive ? 'bg-brand-50 text-brand-700' : 'text-slate-600 hover:bg-slate-100'
                }`
              }
            >
              <item.icon size={18} />
              {item.label}
            </NavLink>
          ))}
        </nav>
      </aside>
      <main className="md:pl-64">
        <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
