import React from 'react';
import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAdminAuth } from '../context/AdminAuthContext';
import { Briefcase, LayoutDashboard, Users, ShieldCheck, BarChart3, History, LogOut } from 'lucide-react';
import LanguageSwitcher from '../components/LanguageSwitcher';

const AdminLayout = () => {
  const { t } = useTranslation();
  const { user, logout } = useAdminAuth();
  const location = useLocation();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/admin/login');
  };

  const navItems = [
    { path: '/admin/dashboard', label: t('nav.dashboard'), icon: LayoutDashboard },
    { path: '/admin/users', label: t('nav.users'), icon: Users },
    { path: '/admin/jobs', label: 'Manage Jobs', icon: ShieldCheck },
    { path: '/admin/analytics', label: t('nav.analytics'), icon: BarChart3 },
    { path: '/admin/audit', label: t('nav.audit'), icon: History }
  ];

  return (
    <div className="min-h-screen bg-bg-primary text-text-primary flex">
      {/* Sidebar (240px) */}
      <aside className="w-sidebar bg-bg-surface border-r border-border-subtle flex flex-col justify-between shrink-0">
        <div>
          {/* Logo Header */}
          <div className="h-navbar border-b border-border-subtle flex items-center px-6 gap-2">
            <Briefcase className="text-brand-green w-6 h-6" />
            <span className="text-xl font-bold tracking-tight text-brand-green">Fursad</span>
            <span className="text-[10px] bg-red-500/20 text-red-500 border border-red-500/35 px-1.5 py-0.5 rounded font-mono uppercase ml-1">Admin</span>
          </div>

          {/* Navigation Links */}
          <nav className="p-4 flex flex-col gap-1">
            {navItems.map((item) => {
              const isActive = location.pathname === item.path;
              const Icon = item.icon;
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  className={`flex items-center gap-3 px-4 py-3 rounded-btn text-sm font-medium transition-all duration-200 ${
                    isActive
                      ? 'bg-brand-green text-bg-primary font-semibold'
                      : 'text-text-secondary hover:text-text-primary hover:bg-bg-elevated'
                  }`}
                >
                  <Icon size={18} />
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </nav>
        </div>

        {/* Sidebar Footer Logout */}
        <div className="p-4 border-t border-border-subtle">
          <div className="mb-4 px-4 py-2 bg-bg-elevated rounded-card">
            <p className="text-xs text-text-muted">Logged in as Admin</p>
            <p className="text-sm font-semibold truncate text-text-primary">{user?.name || 'Administrator'}</p>
          </div>
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-btn text-sm font-medium text-danger hover:bg-danger/10 transition-colors duration-200"
          >
            <LogOut size={18} />
            <span>{t('nav.signout')}</span>
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-grow flex flex-col min-w-0">
        {/* Topbar (64px) */}
        <header className="h-navbar bg-bg-surface border-b border-border-subtle px-8 flex items-center justify-between shrink-0">
          <h2 className="text-lg font-bold text-text-primary">
            {location.pathname === '/admin/dashboard' && 'Admin Overview'}
            {location.pathname === '/admin/users' && t('nav.users')}
            {location.pathname === '/admin/jobs' && 'Manage Job Listings'}
            {location.pathname === '/admin/analytics' && 'Platform Performance Analytics'}
            {location.pathname === '/admin/audit' && 'Audit Log History'}
          </h2>

          <div className="flex items-center gap-4">
            <LanguageSwitcher />
            <div className="h-8 w-8 rounded-full bg-red-500/20 border border-red-500/40 flex items-center justify-center text-sm font-bold text-red-500">
              AD
            </div>
          </div>
        </header>

        {/* Dynamic Pages Container */}
        <main className="flex-grow p-8 overflow-y-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default AdminLayout;
