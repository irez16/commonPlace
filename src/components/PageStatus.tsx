import type { ReactNode } from 'react';
import './PageStatus.css';

interface PageStatusProps {
  // 'loading' is the quiet mono label; 'error' is body text in the accent
  // colour; 'info' is plain muted body text (e.g. "not found").
  tone?: 'loading' | 'error' | 'info';
  children: ReactNode;
}

// Shared full-page loading / error / not-found state, so a cold start
// doesn't show a bare line of text flush against the screen edge.
export default function PageStatus({ tone = 'loading', children }: PageStatusProps) {
  return (
    <div
      className={`page-status page-status-${tone}`}
      role={tone === 'error' ? 'alert' : 'status'}
    >
      {children}
    </div>
  );
}
