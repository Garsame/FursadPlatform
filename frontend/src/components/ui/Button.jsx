import React from 'react';

/**
 * Variants map to intent, not colour:
 *   primary  — the one action we want taken. Bright green + ink text (~8:1).
 *   deep     — strong secondary, or primary when sitting on paper next to green.
 *   onDeep   — for use inside evergreen bands where primary would vibrate.
 *   secondary/ghost/danger — supporting roles.
 */
const Button = ({
  children,
  type = 'button',
  variant = 'primary',
  size = 'md',
  className = '',
  disabled = false,
  onClick,
  fullWidth = false,
  ...props
}) => {
  const baseStyle =
    'inline-flex items-center justify-center gap-2 font-semibold transition-all duration-200 rounded-btn disabled:opacity-50 disabled:cursor-not-allowed disabled:pointer-events-none active:scale-[0.98]';

  const sizes = {
    sm: 'h-9 px-4 text-sm',
    md: 'h-btn px-5 text-sm',
    lg: 'h-12 px-7 text-base',
  };

  const variants = {
    // White text on #00C27C fails WCAG, so ink text is deliberate here.
    primary:   'bg-brand-green hover:bg-brand-hover text-brand-ink shadow-card hover:shadow-lift',
    deep:      'bg-brand-deep hover:bg-brand-deepHover text-text-inverse shadow-card hover:shadow-lift',
    onDeep:    'bg-white/95 hover:bg-white text-brand-deep',
    secondary: 'bg-bg-surface hover:bg-bg-elevated text-text-primary border border-border-subtle hover:border-border-strong',
    ghost:     'bg-transparent hover:bg-brand-muted text-brand-deep',
    danger:    'bg-danger hover:bg-red-700 text-white',
  };

  return (
    <button
      type={type}
      className={`${baseStyle} ${sizes[size]} ${variants[variant]} ${fullWidth ? 'w-full' : ''} ${className}`}
      disabled={disabled}
      onClick={onClick}
      {...props}
    >
      {children}
    </button>
  );
};

export default Button;
