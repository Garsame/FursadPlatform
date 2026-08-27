import React from 'react';

/**
 * Companies on JobAssistAI have no uploaded logo yet (there is no company-branding
 * route), so we render a deterministic monogram instead of inventing a mark.
 * Same name always yields the same colour pairing, so the wall looks designed
 * rather than random.
 */
const PAIRS = [
  { bg: 'bg-brand-deep',        fg: 'text-white' },
  { bg: 'bg-accent-ochre',      fg: 'text-brand-ink' },
  { bg: 'bg-brand-green',       fg: 'text-brand-ink' },
  { bg: 'bg-[#1F4E46]',         fg: 'text-white' },
  { bg: 'bg-[#B4762A]',         fg: 'text-white' },
  { bg: 'bg-[#2F6F5E]',         fg: 'text-white' },
];

export const initialsOf = (name = '') =>
  name
    .replace(/[^A-Za-z0-9 ]/g, ' ')
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0].toUpperCase())
    .join('') || '?';

const hashOf = (s = '') =>
  s.split('').reduce((a, c) => (a * 31 + c.charCodeAt(0)) >>> 0, 7);

const SIZES = {
  sm: 'w-10 h-10 text-xs rounded-[10px]',
  md: 'w-12 h-12 text-sm rounded-xl',
  lg: 'w-16 h-16 text-lg rounded-2xl',
};

const CompanyLogo = ({ name, logoUrl, size = 'md', className = '' }) => {
  const pair = PAIRS[hashOf(name || '') % PAIRS.length];

  if (logoUrl) {
    return (
      <img
        src={logoUrl}
        alt={`${name} logo`}
        loading="lazy"
        className={`${SIZES[size]} object-cover border border-border-subtle ${className}`}
      />
    );
  }

  return (
    <div
      aria-hidden="true"
      className={`${SIZES[size]} ${pair.bg} ${pair.fg} ${className}
        inline-flex items-center justify-center font-bold tracking-tight shrink-0 select-none`}
    >
      {initialsOf(name)}
    </div>
  );
};

export default CompanyLogo;
