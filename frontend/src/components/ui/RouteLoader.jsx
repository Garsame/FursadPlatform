import React from 'react';

/** Full-page loader shown while a route guard resolves the session. */
const RouteLoader = () => (
  <div className="min-h-screen bg-bg-primary flex flex-col items-center justify-center gap-4">
    <div className="w-10 h-10 rounded-full border-[3px] border-border-subtle border-t-brand-green animate-spin" />
    <p className="text-sm text-text-muted">Loading…</p>
  </div>
);

export default RouteLoader;
