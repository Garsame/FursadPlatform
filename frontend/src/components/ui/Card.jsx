import React from 'react';

const Card = ({
  children,
  className = '',
  onClick,
  hoverEffect = false
}) => {
  const hoverStyle = hoverEffect 
    ? 'hover:border-brand-green hover:bg-bg-elevated cursor-pointer transition-all duration-200' 
    : '';

  return (
    <div
      onClick={onClick}
      className={`bg-bg-surface border border-border-subtle rounded-card p-sm ${hoverStyle} ${className}`}
    >
      {children}
    </div>
  );
};

export default Card;
