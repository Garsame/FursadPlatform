import React from 'react';
import { Link, Outlet, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import LanguageSwitcher from '../components/LanguageSwitcher';
import { Briefcase } from 'lucide-react';
import Button from '../components/ui/Button';

const PublicLayout = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-bg-primary text-text-primary flex flex-col font-sans">
      {/* Navigation Header */}
      <header className="sticky top-0 z-40 bg-bg-surface/85 backdrop-blur-md border-b border-border-subtle h-navbar">
        <div className="max-w-7xl mx-auto h-full px-6 flex items-center justify-between">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-2 group">
            <Briefcase className="text-brand-green w-7 h-7 group-hover:rotate-6 transition-transform duration-200" />
            <span className="text-2xl font-extrabold tracking-tight text-brand-green">Fursad</span>
          </Link>

          {/* Links Center */}
          <nav className="hidden md:flex items-center gap-8 text-sm font-medium text-text-secondary">
            <Link to="/" className="hover:text-text-primary hover:border-b-2 hover:border-brand-green py-5 transition-all">
              {t('nav.home')}
            </Link>
            <Link to="/about" className="hover:text-text-primary hover:border-b-2 hover:border-brand-green py-5 transition-all">
              {t('nav.about')}
            </Link>
            <Link to="/contact" className="hover:text-text-primary hover:border-b-2 hover:border-brand-green py-5 transition-all">
              {t('nav.contact')}
            </Link>
          </nav>

          {/* Action Buttons Right */}
          <div className="flex items-center gap-4">
            <LanguageSwitcher />
            <Link to="/signin" className="text-sm font-medium text-text-secondary hover:text-text-primary transition-colors">
              {t('nav.signin')}
            </Link>
            <Button variant="primary" onClick={() => navigate('/signup')}>
              {t('nav.get_started')}
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-grow">
        <Outlet />
      </main>

      {/* Public Footer */}
      <footer className="bg-bg-surface border-t border-border-subtle py-8">
        <div className="max-w-7xl mx-auto px-6 flex flex-col md:flex-row items-center justify-between gap-6">
          {/* Left Column */}
          <div className="flex flex-col items-center md:items-start gap-2">
            <div className="flex items-center gap-2">
              <Briefcase className="text-brand-green w-5 h-5" />
              <span className="text-lg font-bold text-brand-green">Fursad</span>
            </div>
            <p className="text-xs text-text-muted">{t('home.hero_subtitle')}</p>
          </div>

          {/* Center Column - Links */}
          <div className="flex items-center gap-6 text-xs text-text-secondary">
            <Link to="/" className="hover:text-text-primary transition-colors">{t('nav.home')}</Link>
            <Link to="/about" className="hover:text-text-primary transition-colors">{t('nav.about')}</Link>
            <Link to="/contact" className="hover:text-text-primary transition-colors">{t('nav.contact')}</Link>
            <span className="text-text-muted">|</span>
            <span className="text-text-muted">&copy; {new Date().getFullYear()} Fursad. All rights reserved.</span>
          </div>

          {/* Right Column - Language Switcher footer */}
          <div>
            <LanguageSwitcher />
          </div>
        </div>
      </footer>
    </div>
  );
};

export default PublicLayout;
