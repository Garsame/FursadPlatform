import React, { useState, useEffect } from 'react';
import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useProviderAuth } from '../context/ProviderAuthContext';
import {
  LayoutDashboard, PlusCircle, Briefcase, Building2, LogOut, Menu, MessageSquare,
} from 'lucide-react';
import LanguageSwitcher from '../components/LanguageSwitcher';
import NotificationBell from '../components/NotificationBell';
import Logo from '../components/Logo';
import api from '../services/api';

const ProviderLayout = () => {
  const { t } = useTranslation();
  const { user, logout } = useProviderAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [unread, setUnread] = useState(0);

  // Unread count for the sidebar badge, refreshed on navigation so opening a
  // conversation clears it without a reload.
  useEffect(() => {
    let cancelled = false;
    api.get('/applications/employer/threads')
      .then((res) => { if (!cancelled && res.data?.success) setUnread(res.data.unreadTotal || 0); })
      .catch(() => {});
    return () => { cancelled = true; };
  }, [location.pathname]);

  const handleLogout = () => { logout(); navigate('/'); };

  const navItems = [
    { path: '/provider/dashboard', label: t('nav.dashboard'),   icon: LayoutDashboard },
    { path: '/provider/jobs/new',  label: t('nav.post_job'),    icon: PlusCircle },
    { path: '/provider/jobs',      label: t('provider.my_jobs'), icon: Briefcase },
    { path: '/provider/messages',  label: 'Job Messages',       icon: MessageSquare, badge: unread },
    { path: '/provider/company',   label: t('provider.company'), icon: Building2 },
  ];

  const title = navItems.find((i) => i.path === location.pathname)?.label
    || (location.pathname.includes('/applicants') ? t('provider.applicants') : '');

  const Body = () => (
    <>
      <div className="h-navbar border-b border-border-subtle flex items-center px-5 shrink-0">
        <Link to="/provider/dashboard" aria-label="JobAssistAI"><Logo /></Link>
      </div>

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

      <div className="shrink-0 border-t border-border-subtle p-3">
        <div className="px-3 py-2.5 rounded-btn bg-bg-elevated">
          <p className="text-[11px] text-text-muted leading-none">{t('nav.logged_in_as')}</p>
          <p className="text-sm font-semibold truncate text-text-primary mt-1">{user?.name || 'Employer'}</p>
        </div>
        <button
          onClick={handleLogout}
          className="w-full flex items-center gap-3 px-4 py-2.5 mt-2 rounded-btn text-sm font-medium
            text-danger hover:bg-danger/8 transition-colors"
        >
          <LogOut size={18} /> <span>{t('nav.signout')}</span>
        </button>
      </div>
    </>
  );

  return (
    <div className="h-screen bg-bg-primary text-text-primary flex overflow-hidden">
      <aside className="hidden lg:flex w-sidebar bg-bg-surface border-r border-border-subtle flex-col shrink-0 h-screen">
        <Body />
      </aside>

      {mobileOpen && (
        <>
          <div className="lg:hidden fixed inset-0 z-40 bg-brand-deep/40 backdrop-blur-sm" onClick={() => setMobileOpen(false)} />
          <aside className="lg:hidden fixed left-0 top-0 bottom-0 z-50 w-sidebar bg-bg-surface border-r border-border-subtle flex flex-col shadow-lift">
            <Body />
          </aside>
        </>
      )}

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
            <h2 className="text-lg font-bold text-text-primary truncate">{title}</h2>
          </div>
          <div className="flex items-center gap-3">
            <NotificationBell />
            <LanguageSwitcher />
            <div className="w-9 h-9 rounded-full bg-brand-deep text-text-inverse grid place-items-center text-xs font-bold">
              {(user?.name || 'EM').split(' ').filter(Boolean).slice(0, 2).map((w) => w[0].toUpperCase()).join('')}
            </div>
          </div>
        </header>

        <main className="flex-1 min-h-0 overflow-y-auto p-5 sm:p-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default ProviderLayout;
