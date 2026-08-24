import React from 'react';

const Card = ({
  children,
  className = '',
  onClick,
  hoverEffect = false,
  as: Tag = 'div',
  padded = true,
}) => {
  const hoverStyle = hoverEffect
    ? 'cursor-pointer hover:-translate-y-0.5 hover:shadow-lift hover:border-brand-green/45'
    : '';

  return (
    <Tag
      onClick={onClick}
      className={`bg-bg-surface border border-border-subtle rounded-card shadow-card
        transition-all duration-200 ${padded ? 'p-sm' : ''} ${hoverStyle} ${className}`}
    >
      {children}
    </Tag>
  );
};

export default Card;
