import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import * as Sentry from '@sentry/react'
import './index.css'
import App from './App.tsx'
import ErrorBoundary from './components/ErrorBoundary.tsx'
import { initTheme } from './lib/theme'

initTheme();

// No-op entirely if VITE_SENTRY_DSN isn't set, rather than calling
// Sentry.init with an empty DSN — keeps local/dev runs quiet and
// makes "is monitoring configured at all" an explicit yes/no rather
// than something buried in Sentry's own DSN-validation behavior.
const SENTRY_DSN = import.meta.env.VITE_SENTRY_DSN as string | undefined;
if (SENTRY_DSN) {
  Sentry.init({
    dsn: SENTRY_DSN,
    // Capturing uncaught errors and unhandled promise rejections is
    // enough for a small app — no session replay or performance
    // tracing wired up, since that's more infrastructure than this
    // needs right now.
  });
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary>
      <BrowserRouter>
        <App />
      </BrowserRouter>
    </ErrorBoundary>
  </StrictMode>,
)
