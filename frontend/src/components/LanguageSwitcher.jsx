import React from 'react';
import { useTranslation } from 'react-i18next';
import { Globe } from 'lucide-react';

const LanguageSwitcher = ({ className = '', variant = 'default' }) => {
  const { i18n } = useTranslation();
  const isSomali = i18n.language === 'so';

  const toggleLanguage = () => i18n.changeLanguage(isSomali ? 'en' : 'so');

  const styles =
    variant === 'onDeep'
      ? 'bg-white/10 hover:bg-white/18 border-border-onDeep text-text-inverse'
      : 'bg-bg-surface hover:bg-bg-elevated border-border-subtle hover:border-border-strong text-text-secondary hover:text-text-primary';

  return (
    <button
      onClick={toggleLanguage}
      className={`inline-flex items-center gap-2 px-3 h-9 rounded-pill border text-sm font-medium
        transition-all duration-200 ${styles} ${className}`}
      title={isSomali ? 'Switch to English' : 'U badal Soomaali'}
    >
      <Globe size={15} className={variant === 'onDeep' ? 'text-brand-green' : 'text-brand-deep'} />
      <span>{isSomali ? 'EN' : 'SO'}</span>
    </button>
  );
};

export default LanguageSwitcher;
