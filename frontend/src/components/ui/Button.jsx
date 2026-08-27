import React from 'react';
import { Loader2 } from 'lucide-react';

/**
 * Variants map to intent, not colour:
 *   primary  — the one action we want taken. Bright green + ink text (~8:1).
 *   deep     — strong secondary, or primary when sitting on paper next to green.
 *   onDeep   — for use inside evergreen bands where primary would vibrate.
 *   secondary/ghost/danger — supporting roles.
 *
 * `loading` is the button's own busy state: it shows a spinner before the
 * label and blocks further clicks. It lives here rather than at each call site
 * because almost every action on JobAssistAI waits on something slow — a Gemini
 * call, an outbound email, a fan-out of notifications — and a button that
 * looks idle while that happens is the single most common reason a person
 * presses it twice.
 */
const Button = ({
  children,
  type = 'button',
  variant = 'primary',
  size = 'md',
  className = '',
  disabled = false,
  loading = false,
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

  const spinnerSize = size === 'lg' ? 17 : size === 'sm' ? 14 : 16;

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
      // A loading button is never also clickable — otherwise the same request
      // fires twice and, on a status change, writes two audit entries.
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      onClick={onClick}
      {...props}
    >
      {loading && <Loader2 size={spinnerSize} className="animate-spin shrink-0" aria-hidden="true" />}
      {children}
    </button>
  );
};

export default Button;
