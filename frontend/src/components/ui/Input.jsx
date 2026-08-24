import React from 'react';

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
  return (
    <div className={`flex flex-col gap-1.5 ${className}`}>
      {label && (
        <label htmlFor={name} className="text-sm font-semibold text-text-primary">
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
          id={name}
          type={type}
          name={name}
          placeholder={placeholder}
          value={value}
          onChange={onChange}
          required={required}
          aria-invalid={!!error}
          className={`w-full h-input bg-bg-surface border rounded-input text-text-primary placeholder:text-text-muted
            transition-all duration-200 focus:outline-none
            ${Icon ? 'pl-10 pr-4' : 'px-4'}
            ${error
              ? 'border-danger focus:ring-4 focus:ring-danger/15'
              : 'border-border-subtle hover:border-border-strong focus:border-brand-green focus:ring-4 focus:ring-brand-green/18'
            }`}
          {...props}
        />
      </div>

      {error
        ? <span className="text-xs font-medium text-danger">{error}</span>
        : hint && <span className="text-xs text-text-muted">{hint}</span>}
    </div>
  );
};

export default Input;
