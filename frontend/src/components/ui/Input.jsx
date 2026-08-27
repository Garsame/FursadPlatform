import React, { useId, useState } from 'react';
import { Eye, EyeOff } from 'lucide-react';
import { useTranslation } from 'react-i18next';

/**
 * One text field for the whole platform.
 *
 * When `type="password"` it grows a reveal toggle on the right. Every password
 * on JobAssistAI — sign-in, sign-up, the two confirmations, password reset, and the
 * administrator's authorisation token — renders through this component, so the
 * behaviour is defined once and cannot drift between portals.
 *
 * Why it matters here in particular: the minimum password is eight characters,
 * two of the forms ask for the same password twice, and the admin secret is a
 * 64-character hex string. Typing any of those blind, on a phone, is where
 * people give up. The toggle is the cheapest fix for that.
 *
 * It always starts hidden and the state is per-field and never persisted —
 * revealing is a deliberate act by the person at the keyboard, not a setting
 * that quietly leaves a password on screen for whoever walks past next.
 */
const Input = ({
  type = 'text',
  label,
  placeholder,
  value,
  onChange,
  name,
  error,
  hint,
  icon: Icon,
  required = false,
  className = '',
  ...props
}) => {
  const { t } = useTranslation();
  const [revealed, setRevealed] = useState(false);

  const isPassword = type === 'password';

  // Several call sites render an Input without a `name`, which left both the
  // id and the label's htmlFor undefined — so clicking the label focused
  // nothing. useId gives every field a stable unique fallback.
  const generatedId = useId();
  const fieldId = name || generatedId;

  // The reveal button occupies the right inset, so padding is tracked per side
  // rather than as a single shorthand.
  const padLeft = Icon ? 'pl-10' : 'pl-4';
  const padRight = isPassword ? 'pr-11' : 'pr-4';

  return (
    <div className={`flex flex-col gap-1.5 ${className}`}>
      {label && (
        <label htmlFor={fieldId} className="text-sm font-semibold text-text-primary">
          {label} {required && <span className="text-danger">*</span>}
        </label>
      )}

      <div className="relative">
        {Icon && (
          <Icon
            size={17}
            className="absolute left-3.5 top-1/2 -translate-y-1/2 text-text-muted pointer-events-none"
          />
        )}

        <input
          id={fieldId}
          type={isPassword && revealed ? 'text' : type}
          name={name}
          placeholder={placeholder}
          value={value}
          onChange={onChange}
          required={required}
          aria-invalid={!!error}
          className={`w-full h-input bg-bg-surface border rounded-input text-text-primary placeholder:text-text-muted
            transition-all duration-200 focus:outline-none
            ${padLeft} ${padRight}
            ${error
              ? 'border-danger focus:ring-4 focus:ring-danger/15'
              : 'border-border-subtle hover:border-border-strong focus:border-brand-green focus:ring-4 focus:ring-brand-green/18'
            }`}
          {...props}
        />

        {isPassword && (
          /*
            type="button" is load-bearing: inside a <form>, a button with no
            type defaults to submit, so revealing the password would fire the
            sign-in request instead.
          */
          <button
            type="button"
            onClick={() => setRevealed((v) => !v)}
            aria-label={revealed ? t('auth.hide_password') : t('auth.show_password')}
            aria-pressed={revealed}
            aria-controls={fieldId}
            title={revealed ? t('auth.hide_password') : t('auth.show_password')}
            className="absolute right-1 top-1/2 -translate-y-1/2 w-9 h-9 grid place-items-center
              rounded-input text-text-muted hover:text-brand-deep hover:bg-bg-elevated
              focus-visible:ring-4 focus-visible:ring-brand-green/30 transition-colors duration-200"
          >
            {revealed ? <EyeOff size={17} /> : <Eye size={17} />}
          </button>
        )}
      </div>

      {error
        ? <span className="text-xs font-medium text-danger">{error}</span>
        : hint && <span className="text-xs text-text-muted">{hint}</span>}
    </div>
  );
};

export default Input;
