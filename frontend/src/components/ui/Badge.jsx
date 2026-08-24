import React from 'react';

const Badge = ({
  children,
  variant = 'neutral',
  className = '',
}) => {
  const baseStyle =
    'inline-flex items-center gap-1.5 rounded-pill px-2.5 py-1 text-xs font-semibold whitespace-nowrap';

  const variants = {
    neutral: 'bg-bg-elevated text-text-secondary border border-border-subtle',
    brand:   'bg-brand-muted text-brand-deep border border-brand-green/30',
    success: 'bg-success/10 text-success border border-success/25',
    info:    'bg-info/10 text-info border border-info/25',
    warning: 'bg-accent-ochreMuted text-accent-ochreInk border border-accent-ochre/35',
    danger:  'bg-danger/10 text-danger border border-danger/25',
    onDeep:  'bg-white/12 text-text-inverse border border-border-onDeep',
  };

  return (
    <span className={`${baseStyle} ${variants[variant]} ${className}`}>
      {children}
    </span>
  );
};

export default Badge;
