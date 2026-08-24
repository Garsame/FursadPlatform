import React from 'react';

/**
 * Wordmark. The "F" sits in a rounded evergreen tile with a bright-green
 * counter, so the two-tier brand relationship is visible in the mark itself.
 */
const Logo = ({ variant = 'default', className = '' }) => {
  const isInverse = variant === 'inverse';

  return (
    <span className={`inline-flex items-center gap-2.5 group ${className}`}>
      <span
        className={`relative w-9 h-9 rounded-[11px] grid place-items-center shrink-0
          transition-transform duration-300 group-hover:-rotate-6
          ${isInverse ? 'bg-brand-green' : 'bg-brand-deep'}`}
      >
        <svg viewBox="0 0 24 24" className="w-[18px] h-[18px]" aria-hidden="true">
          <path
            d="M5 3h14v4.2H10.2v4.1h7.6v4.2h-7.6V21H5z"
            fill={isInverse ? '#06231A' : '#00C27C'}
          />
        </svg>
      </span>
      <span
        className={`text-[22px] font-extrabold tracking-tight font-display
          ${isInverse ? 'text-text-inverse' : 'text-brand-deep'}`}
      >
        Fursad
      </span>
    </span>
  );
};

export default Logo;
