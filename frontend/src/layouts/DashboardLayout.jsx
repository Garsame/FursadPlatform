import React, { useState, useEffect } from 'react';
import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useJobseekerAuth } from '../context/JobseekerAuthContext';
import {
  LayoutDashboard, Search, FileText, User, LogOut, FileStack, Menu, X, Sparkles, MessageSquare, BarChart3,
} from 'lucide-react';
import LanguageSwitcher from '../components/LanguageSwitcher';
import Logo from '../components/Logo';
import api from '../services/api';
import NotificationBell from '../components/NotificationBell';
import AssistantWidget from '../components/AssistantWidget';

const DashboardLayout = () => {
  const { t } = useTranslation();
  const { user, logout } = useJobseekerAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [unread, setUnread] = useState(0);

  // Unread count for the sidebar badge. Re-read on navigation so opening the
  // inbox clears it without a page reload.
  useEffect(() => {
    let cancelled = false;
    api.get('/applications/threads')
      .then((res) => { if (!cancelled && res.data?.success) setUnread(res.data.unreadTotal || 0); })
      .catch(() => {});
    return () => { cancelled = true; };
  }, [location.pathname]);

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  const navItems = [
    { path: '/dashboard',              label: t('nav.dashboard'),    icon: LayoutDashboard },
    { path: '/dashboard/jobs',         label: t('nav.jobs'),         icon: Search },
    { path: '/dashboard/cvs',          label: t('nav.my_cvs'),       icon: FileStack },
    { path: '/dashboard/cv-performance', label: 'CV Performance',    icon: BarChart3 },
    { path: '/dashboard/build',        label: t('nav.build_profile'), icon: Sparkles },
    { path: '/dashboard/applications', label: t('nav.applications'), icon: FileText },
    { path: '/dashboard/messages',     label: t('nav.messages'),     icon: MessageSquare, badge: unread },
    { path: '/dashboard/profile',      label: t('nav.profile'),      icon: User },
  ];

  const pageTitle = navItems.find((i) => i.path === location.pathname)?.label || '';

  const SidebarBody = () => (
    <>
      {/* Brand */}
      <div className="h-navbar border-b border-border-subtle flex items-center px-5 shrink-0">
        <Link to="/" aria-label="Fursad home"><Logo /></Link>
      </div>

      {/* Only this list scrolls — the user block below stays pinned. */}
      <nav className="flex-1 min-h-0 overflow-y-auto p-3 flex flex-col gap-1">
        {navItems.map((item) => {
          const isActive = location.pathname === item.path;
          const Icon = item.icon;
          return (
            <Link
              key={item.path}
              to={item.path}
              onClick={() => setMobileOpen(false)}
              className={`flex items-center gap-3 px-4 py-2.5 rounded-btn text-sm transition-all duration-200 ${
                isActive
                  ? 'bg-brand-deep text-text-inverse font-semibold shadow-card'
                  : 'text-text-secondary hover:text-text-primary hover:bg-bg-elevated font-medium'
              }`}
            >
              <Icon size={18} className={isActive ? 'text-brand-green' : ''} />
              <span className="flex-1">{item.label}</span>
              {item.badge > 0 && (
                <span className="min-w-[20px] h-5 px-1.5 grid place-items-center rounded-pill
                  bg-brand-green text-brand-ink text-[11px] font-bold">
                  {item.badge}
                </span>
              )}
            </Link>
          );
        })}
      </nav>

      {/* Pinned to the bottom of the sidebar, never scrolls away. */}
      <div className="shrink-0 border-t border-border-subtle p-3">
        <div className="flex items-center gap-3 px-2 py-2.5 rounded-btn bg-bg-elevated">
          <Avatar user={user} />
          <div className="min-w-0">
            <p className="text-[11px] text-text-muted leading-none">{t('nav.logged_in_as')}</p>
            <p className="text-sm font-semibold truncate text-text-primary mt-1">
              {user?.name || 'Job Seeker'}
            </p>
          </div>
        </div>
        <button
          onClick={handleLogout}
          className="w-full flex items-center gap-3 px-4 py-2.5 mt-2 rounded-btn text-sm font-medium
            text-danger hover:bg-danger/8 transition-colors duration-200"
        >
          <LogOut size={18} />
          <span>{t('nav.signout')}</span>
        </button>
      </div>
    </>
  );

  return (
    <div className="h-screen bg-bg-primary text-text-primary flex overflow-hidden">
      {/* Desktop sidebar: fixed full height, does not move with the page. */}
      <aside className="hidden lg:flex w-sidebar bg-bg-surface border-r border-border-subtle flex-col shrink-0 h-screen">
        <SidebarBody />
      </aside>

      {/* Mobile drawer */}
      {mobileOpen && (
        <>
          <div className="lg:hidden fixed inset-0 z-40 bg-brand-deep/40 backdrop-blur-sm" onClick={() => setMobileOpen(false)} />
          <aside className="lg:hidden fixed left-0 top-0 bottom-0 z-50 w-sidebar bg-bg-surface border-r border-border-subtle flex flex-col shadow-lift">
            <SidebarBody />
          </aside>
        </>
      )}

      {/* Main column — this is the only region that scrolls. */}
      <div className="flex-1 flex flex-col min-w-0 h-screen">
        <header className="h-navbar bg-bg-surface border-b border-border-subtle px-5 sm:px-8 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <button
              className="lg:hidden p-2 -ml-2 rounded-btn text-text-primary hover:bg-bg-elevated"
              onClick={() => setMobileOpen(true)}
              aria-label="Open menu"
            >
              <Menu size={20} />
            </button>
            <h2 className="text-lg font-bold text-text-primary truncate">{pageTitle}</h2>
          </div>

          <div className="flex items-center gap-3">
            <NotificationBell />
            <LanguageSwitcher />
            <Avatar user={user} />
          </div>
        </header>

        <main className="flex-1 min-h-0 overflow-y-auto p-5 sm:p-8">
          <Outlet />
        </main>
      </div>

      {/* Floats above the whole shell, so it must sit outside the scrolling column. */}
      <AssistantWidget />
    </div>
  );
};

const Avatar = ({ user, size = 'w-9 h-9' }) => {
  const initials = (user?.name || 'JS')
    .split(' ').filter(Boolean).slice(0, 2).map((w) => w[0].toUpperCase()).join('');

  if (user?.avatarUrl) {
    return (
      <img
        src={`http://localhost:5000${user.avatarUrl}`}
        alt=""
        className={`${size} rounded-full object-cover border border-border-subtle shrink-0`}
      />
    );
  }

  return (
    <div className={`${size} rounded-full bg-brand-deep text-text-inverse grid place-items-center
      text-xs font-bold shrink-0`}>
      {initials}
    </div>
  );
};

export default DashboardLayout;
