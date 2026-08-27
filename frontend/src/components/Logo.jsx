import React from 'react';

/**
 * The JobAssistAI mark and wordmark.
 *
 * Two strokes converge into a checkmark: one arriving from the candidate's
 * side, one from the employer's, meeting at an amber node — the moment a match
 * is confirmed. It is the product's whole idea in one shape.
 *
 * Drawn as inline SVG rather than loaded as an image, so it is sharp at every
 * size from a 16px favicon upward, costs no network request, and takes its
 * colours from the same palette as the rest of the interface.
 *
 * `variant="inverse"` is for the evergreen bands: the deep-green stroke would
 * disappear against them, so it lightens to the on-deep tint while the mint
 * stroke and amber node — both of which already have contrast — stay put.
 */
const Logo = ({ variant = 'default', className = '', showWordmark = true }) => {
  const isInverse = variant === 'inverse';

  return (
    <span className={`inline-flex items-center gap-2.5 group ${className}`}>
      <svg
        viewBox="0 0 100 100"
        className="w-9 h-9 shrink-0 transition-transform duration-300 group-hover:-translate-y-0.5"
        role="img"
        aria-label="JobAssistAI"
      >
        <g fill="none" strokeLinecap="round" strokeWidth="16">
          <path d="M17 39 L45 63" stroke={isInverse ? '#D9E7E1' : '#0B5C43'} />
          <path d="M45 63 L83 27" stroke="#00C27C" />
        </g>
        <circle cx="45" cy="63" r="9" fill="#E0A340" />
      </svg>

      {showWordmark && (
        <span
          className={`text-[22px] font-extrabold tracking-tight font-display leading-none
            ${isInverse ? 'text-text-inverse' : 'text-brand-deep'}`}
        >
          JobAssist<span className="text-brand-green">AI</span>
        </span>
      )}
    </span>
  );
};

export default Logo;
