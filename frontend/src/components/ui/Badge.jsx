import React from 'react';

const Badge = ({
  children,
  variant = 'neutral',
  className = ''
}) => {
  const baseStyle = 'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold';
  
  const variants = {
    neutral: 'bg-bg-elevated text-text-secondary border border-border-subtle',
    success: 'bg-success/10 text-success border border-success/30',
    info: 'bg-info/10 text-info border border-info/30',
    warning: 'bg-warning/10 text-warning border border-warning/30',
    danger: 'bg-danger/10 text-danger border border-danger/30'
  };

  return (
    <span className={`${baseStyle} ${variants[variant]} ${className}`}>
      {children}
    </span>
  );
};

export default Badge;
