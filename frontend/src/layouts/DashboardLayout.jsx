import React from 'react';
import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useJobseekerAuth } from '../context/JobseekerAuthContext';
import { Briefcase, LayoutDashboard, Search, FileText, User, LogOut } from 'lucide-react';
import LanguageSwitcher from '../components/LanguageSwitcher';

const DashboardLayout = () => {
  const { t } = useTranslation();
  const { user, logout } = useJobseekerAuth();
  const location = useLocation();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  const navItems = [
    { path: '/dashboard', label: t('nav.dashboard'), icon: LayoutDashboard },
    { path: '/dashboard/jobs', label: t('nav.jobs'), icon: Search },
    { path: '/dashboard/applications', label: t('nav.applications'), icon: FileText },
    { path: '/dashboard/profile', label: t('nav.profile'), icon: User }
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
            <span className="text-[10px] bg-brand-green/20 text-brand-green px-1.5 py-0.5 rounded font-mono uppercase ml-1">Doer</span>
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
            <p className="text-xs text-text-muted">Logged in as</p>
            <p className="text-sm font-semibold truncate text-text-primary">{user?.name || 'Job Seeker'}</p>
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
            {location.pathname === '/dashboard' && t('nav.dashboard')}
            {location.pathname === '/dashboard/jobs' && t('nav.jobs')}
            {location.pathname === '/dashboard/applications' && t('nav.applications')}
            {location.pathname === '/dashboard/profile' && t('nav.profile')}
          </h2>

          <div className="flex items-center gap-4">
            <LanguageSwitcher />
            <div className="h-8 w-8 rounded-full bg-brand-green/20 border border-brand-green/40 flex items-center justify-center text-sm font-bold text-brand-green">
              {user?.name?.slice(0, 2).toUpperCase() || 'JS'}
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

export default DashboardLayout;
