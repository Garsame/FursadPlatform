import React from 'react';
import { useTranslation } from 'react-i18next';
import { Globe } from 'lucide-react';

const LanguageSwitcher = ({ className = '' }) => {
  const { i18n } = useTranslation();

  const toggleLanguage = () => {
    const nextLang = i18n.language === 'en' ? 'so' : 'en';
    i18n.changeLanguage(nextLang);
  };

  return (
    <button
      onClick={toggleLanguage}
      className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-btn bg-bg-surface hover:bg-bg-elevated border border-border-subtle hover:border-brand-green text-sm text-text-secondary hover:text-text-primary transition-all duration-200 ${className}`}
      title={i18n.language === 'en' ? 'U badal Soomaali' : 'Switch to English'}
    >
      <Globe size={16} className="text-brand-green" />
      <span>{i18n.language === 'en' ? 'Somali' : 'English'}</span>
    </button>
  );
};

export default LanguageSwitcher;
