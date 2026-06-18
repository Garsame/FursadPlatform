import React from 'react';

const Button = ({
  children,
  type = 'button',
  variant = 'primary',
  className = '',
  disabled = false,
  onClick,
  fullWidth = false
}) => {
  const baseStyle = 'inline-flex items-center justify-center font-medium transition-colors duration-200 focus:outline-none rounded-btn h-btn px-5 disabled:opacity-50 disabled:cursor-not-allowed';
  
  const variants = {
    primary: 'bg-brand-green hover:bg-brand-hover text-bg-primary font-semibold',
    secondary: 'bg-bg-elevated hover:bg-border-strong text-text-primary border border-border-subtle',
    danger: 'bg-danger hover:bg-red-600 text-text-primary',
    ghost: 'bg-transparent hover:bg-bg-elevated text-brand-green'
  };

  const widthStyle = fullWidth ? 'w-full' : '';

  return (
    <button
      type={type}
      className={`${baseStyle} ${variants[variant]} ${widthStyle} ${className}`}
      disabled={disabled}
      onClick={onClick}
    >
      {children}
    </button>
  );
};

export default Button;
