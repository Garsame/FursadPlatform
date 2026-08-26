import React from 'react';
import { Loader2 } from 'lucide-react';

/**
 * Activity indicators, in the two shapes the app actually needs.
 *
 * `Spinner` is the inline mark — inside a button, beside a select, next to a
 * label. `LoadingBlock` owns a region of the page while its contents are being
 * fetched, and says what is being waited on rather than spinning anonymously.
 *
 * Both are marked aria-hidden or wrapped in role="status" as appropriate, so a
 * screen reader announces the wait once instead of reading a decorative icon.
 */
const SIZES = { xs: 13, sm: 15, md: 18, lg: 26, xl: 34 };

export const Spinner = ({ size = 'md', className = '' }) => (
  <Loader2
    size={SIZES[size] || SIZES.md}
    className={`animate-spin ${className}`}
    aria-hidden="true"
  />
);

export const LoadingBlock = ({ label = 'Loading…', className = '' }) => (
  <div
    role="status"
    aria-live="polite"
    className={`flex flex-col items-center justify-center gap-3 py-14 ${className}`}
  >
    <Spinner size="lg" className="text-brand-green" />
    <p className="text-sm text-text-muted">{label}</p>
  </div>
);

export default Spinner;
