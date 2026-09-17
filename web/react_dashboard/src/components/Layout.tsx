import { type FC, useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard, PawPrint, Eye, MapPin, Utensils,
  Settings, LogOut, Menu, X, Brain, Shield, Bell,
  ChevronDown, User
} from 'lucide-react';
import { useAuthStore } from '../store/auth';
import { authApi } from '../lib/api';

const navItems = [
  { to: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/animals',   icon: PawPrint,        label: 'Animals' },
  { to: '/sightings', icon: Eye,             label: 'Sightings' },
  { to: '/map',       icon: MapPin,          label: 'Map Explorer' },
  { to: '/feeding',   icon: Utensils,        label: 'Feeding Points' },
];

const adminItems = [
  { to: '/admin',     icon: Shield,          label: 'Admin Panel' },
  { to: '/admin/ml',  icon: Brain,           label: 'ML Models' },
];

const Layout: FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const handleLogout = async () => {
    try { await authApi.logout(); } catch {}
    logout();
    navigate('/login');
  };

  const Sidebar = () => (
    <aside className="flex flex-col h-full bg-dark-800 border-r border-white/[0.06] w-64 px-4 py-6 gap-6">
      {/* Logo */}
      <div className="flex items-center gap-3 px-2">
        <div className="w-9 h-9 rounded-xl bg-primary-600 flex items-center justify-center shadow-glow-green">
          <PawPrint className="w-5 h-5 text-white" />
        </div>
        <div>
          <p className="font-bold text-white text-sm leading-tight">StrayPulse</p>
          <p className="text-[10px] text-primary-400 font-medium">AI Animal Tracker</p>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 flex flex-col gap-1">
        {navItems.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) => isActive ? 'nav-link-active' : 'nav-link'}
            onClick={() => setSidebarOpen(false)}
          >
            <Icon className="w-4 h-4 flex-shrink-0" />
            {label}
          </NavLink>
        ))}

        {(user?.role === 'admin' || user?.role === 'ngo') && (
          <>
            <div className="my-2 border-t border-white/[0.06]" />
            <p className="text-[10px] uppercase tracking-widest text-gray-600 font-semibold px-3 py-1">
              Management
            </p>
            {adminItems.map(({ to, icon: Icon, label }) => (
              user?.role === 'admin' && (
                <NavLink
                  key={to}
                  to={to}
                  className={({ isActive }) => isActive ? 'nav-link-active' : 'nav-link'}
                  onClick={() => setSidebarOpen(false)}
                >
                  <Icon className="w-4 h-4 flex-shrink-0" />
                  {label}
                </NavLink>
              )
            ))}
          </>
        )}
      </nav>

      {/* User section */}
      <div className="border-t border-white/[0.06] pt-4">
        <div className="flex items-center gap-3 px-2 mb-3">
          <div className="w-8 h-8 rounded-full bg-primary-600/30 flex items-center justify-center border border-primary-500/30">
            <User className="w-4 h-4 text-primary-400" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-white truncate">{user?.name}</p>
            <p className="text-xs text-gray-500 capitalize">{user?.role}</p>
          </div>
        </div>
        <button onClick={handleLogout} className="btn-ghost w-full justify-start text-red-400 hover:text-red-300 hover:bg-red-500/10">
          <LogOut className="w-4 h-4" />
          Sign out
        </button>
      </div>
    </aside>
  );

  return (
    <div className="flex h-screen bg-dark-900 overflow-hidden">
      {/* Desktop sidebar */}
      <div className="hidden lg:flex flex-col">
        <Sidebar />
      </div>

      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <div className="lg:hidden fixed inset-0 z-50 flex">
          <div className="fixed inset-0 bg-black/60" onClick={() => setSidebarOpen(false)} />
          <div className="relative z-50 flex flex-col">
            <Sidebar />
          </div>
        </div>
      )}

      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Mobile topbar */}
        <header className="lg:hidden flex items-center justify-between px-4 py-3 border-b border-white/[0.06] bg-dark-800">
          <button onClick={() => setSidebarOpen(true)} className="btn-ghost p-2">
            <Menu className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-2">
            <PawPrint className="w-5 h-5 text-primary-400" />
            <span className="font-bold text-white text-sm">StrayPulse</span>
          </div>
          <div className="w-9" />
        </header>

        <main className="flex-1 overflow-auto">
          {children}
        </main>
      </div>
    </div>
  );
};

export default Layout;
