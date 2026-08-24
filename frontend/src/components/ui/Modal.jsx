import React, { useEffect } from 'react';
import { X } from 'lucide-react';

const Modal = ({
  isOpen,
  onClose,
  title,
  subtitle,
  children,
  className = '',
  size = 'md',
}) => {
  useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === 'Escape') onClose();
    };

    if (isOpen) {
      document.body.style.overflow = 'hidden';
      window.addEventListener('keydown', handleEscape);
    }

    return () => {
      document.body.style.overflow = 'unset';
      window.removeEventListener('keydown', handleEscape);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const sizes = {
    md: 'max-w-lg',
    lg: 'max-w-2xl',
    xl: 'max-w-4xl',
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" role="dialog" aria-modal="true">
      {/* Green-tinted scrim reads warmer than neutral black on this palette. */}
      <div
        className="fixed inset-0 bg-brand-deep/45 backdrop-blur-sm"
        onClick={onClose}
      />

      <div
        className={`relative w-full ${sizes[size]} bg-bg-surface border border-border-subtle
          rounded-card shadow-lift z-10 animate-fade-up ${className}`}
      >
        <div className="flex items-start justify-between gap-4 border-b border-border-subtle px-sm py-4">
          <div>
            <h3 className="text-lg font-bold text-text-primary font-display">{title}</h3>
            {subtitle && <p className="text-sm text-text-secondary mt-0.5">{subtitle}</p>}
          </div>
          <button
            onClick={onClose}
            aria-label="Close"
            className="shrink-0 p-1.5 -mr-1 rounded-btn text-text-muted hover:text-text-primary hover:bg-bg-elevated transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        <div className="max-h-[70vh] overflow-y-auto px-sm py-sm">
          {children}
        </div>
      </div>
    </div>
  );
};

export default Modal;
