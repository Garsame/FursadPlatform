import React, { useState, useEffect } from 'react';
import { Link, NavLink, Outlet, useNavigate, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Menu, X } from 'lucide-react';
import LanguageSwitcher from '../components/LanguageSwitcher';
import Button from '../components/ui/Button';
import Logo from '../components/Logo';
import AssistantWidget from '../components/AssistantWidget';

const PublicLayout = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  // Close the mobile drawer whenever the route changes.
  useEffect(() => setMobileOpen(false), [location.pathname]);

  const navLinks = [
    { to: '/', label: t('nav.home'), end: true },
    { to: '/jobs', label: t('nav.browse_jobs') },
    { to: '/about', label: t('nav.about') },
    { to: '/contact', label: t('nav.contact') },
  ];

  const linkClass = ({ isActive }) =>
    `relative py-2 text-sm font-medium transition-colors ${
      isActive ? 'text-brand-deep' : 'text-text-secondary hover:text-text-primary'
    } after:absolute after:left-0 after:-bottom-0.5 after:h-0.5 after:rounded-full after:bg-brand-green
     after:transition-all ${isActive ? 'after:w-full' : 'after:w-0 hover:after:w-full'}`;

  return (
    <div className="min-h-screen bg-bg-primary text-text-primary flex flex-col font-sans">
      <header
        className={`sticky top-0 z-40 h-navbar transition-all duration-300 ${
          scrolled
            ? 'bg-bg-surface/85 backdrop-blur-xl border-b border-border-subtle shadow-card'
            : 'bg-transparent border-b border-transparent'
        }`}
      >
        <div className="max-w-7xl mx-auto h-full px-6 flex items-center justify-between gap-6">
          <Link to="/" className="shrink-0" aria-label="Fursad home">
            <Logo />
          </Link>

          <nav className="hidden md:flex items-center gap-8">
            {navLinks.map((l) => (
              <NavLink key={l.to} to={l.to} end={l.end} className={linkClass}>
                {l.label}
              </NavLink>
            ))}
          </nav>

          <div className="hidden md:flex items-center gap-3">
            <LanguageSwitcher />
            <Link
              to="/signin"
              className="text-sm font-semibold text-text-secondary hover:text-brand-deep transition-colors px-2"
            >
              {t('nav.signin')}
            </Link>
            <Button variant="primary" onClick={() => navigate('/signup')}>
              {t('nav.get_started')}
            </Button>
          </div>

          <button
            className="md:hidden p-2 -mr-2 rounded-btn text-text-primary hover:bg-bg-elevated"
            onClick={() => setMobileOpen((v) => !v)}
            aria-label="Toggle menu"
            aria-expanded={mobileOpen}
          >
            {mobileOpen ? <X size={22} /> : <Menu size={22} />}
          </button>
        </div>

        {mobileOpen && (
          <div className="md:hidden bg-bg-surface border-b border-border-subtle shadow-lift px-6 py-5 flex flex-col gap-1 animate-fade-up">
            {navLinks.map((l) => (
              <NavLink
                key={l.to}
                to={l.to}
                end={l.end}
                className={({ isActive }) =>
                  `py-2.5 text-base font-medium ${isActive ? 'text-brand-deep' : 'text-text-secondary'}`
                }
              >
                {l.label}
              </NavLink>
            ))}
            <div className="h-px bg-border-subtle my-3" />
            <div className="flex items-center justify-between gap-3">
              <LanguageSwitcher />
              <Link to="/signin" className="text-sm font-semibold text-text-secondary">
                {t('nav.signin')}
              </Link>
            </div>
            <Button variant="primary" fullWidth className="mt-3" onClick={() => navigate('/signup')}>
              {t('nav.get_started')}
            </Button>
          </div>
        )}
      </header>

      <main className="flex-grow">
        <Outlet />
      </main>

      {/* ---------------------------------------------------------------- */}
      <footer className="bg-bg-deeper text-text-inverse mt-2xl">
        <div className="max-w-7xl mx-auto px-6 py-2xl">
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-x-8 gap-y-10">
            <div className="col-span-2 lg:col-span-2">
              <Logo variant="inverse" />
              <p className="text-sm text-text-onDeepDim mt-4 max-w-xs leading-relaxed">
                {t('footer.blurb')}
              </p>
              <div className="mt-6">
                <LanguageSwitcher variant="onDeep" />
              </div>
            </div>

            <FooterCol
              title={t('footer.candidates')}
              links={[
                { to: '/jobs', label: t('nav.browse_jobs') },
                { to: '/signup', label: t('footer.create_profile') },
                { to: '/signin', label: t('nav.signin') },
              ]}
            />
            <FooterCol
              title={t('footer.employers')}
              links={[
                { to: '/provider/login', label: t('footer.employer_signin') },
                { to: '/provider/signup', label: t('footer.post_job') },
              ]}
            />
            <FooterCol
              title={t('footer.company')}
              links={[
                { to: '/about', label: t('nav.about') },
                { to: '/contact', label: t('nav.contact') },
              ]}
            />
          </div>

          <div className="mt-2xl pt-6 border-t border-border-onDeep flex flex-col sm:flex-row items-center justify-between gap-4">
            <p className="text-xs text-text-onDeepDim">
              &copy; {new Date().getFullYear()} Fursad. {t('footer.rights')}
            </p>
            <p className="text-xs text-text-onDeepDim">{t('footer.made_in')}</p>
          </div>
        </div>
      </footer>
      <AssistantWidget />
    </div>
  );
};

const FooterCol = ({ title, links }) => (
  <div>
    <h4 className="text-xs font-bold uppercase tracking-[0.14em] text-accent-ochre mb-4">{title}</h4>
    <ul className="flex flex-col gap-2.5">
      {links.map((l) => (
        <li key={l.to + l.label}>
          <Link
            to={l.to}
            className="text-sm text-text-onDeepDim hover:text-text-inverse transition-colors"
          >
            {l.label}
          </Link>
        </li>
      ))}
    </ul>
  </div>
);

export default PublicLayout;
