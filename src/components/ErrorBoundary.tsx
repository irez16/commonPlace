import { Component } from 'react';
import type { ErrorInfo, ReactNode } from 'react';
import * as Sentry from '@sentry/react';
import './ErrorBoundary.css';

interface ErrorBoundaryProps {
  children: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
}

// React error boundaries have to be class components — there's no hook
// equivalent (getDerivedStateFromError / componentDidCatch aren't
// available to function components). Without this, any uncaught error
// anywhere in the component tree white-screens the entire app with no
// fallback UI at all.
export default class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(): ErrorBoundaryState {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    // console.error is the only record if Sentry isn't configured
    // (VITE_SENTRY_DSN unset — Sentry.captureException becomes a
    // harmless no-op in that case, not an error itself).
    console.error('Uncaught error:', error, info.componentStack);
    Sentry.captureException(error, { extra: { componentStack: info.componentStack } });
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="error-boundary">
          <h1>Something went wrong</h1>
          <p>
            The page hit an unexpected error. Try reloading, and if it keeps
            happening, that's worth reporting.
          </p>
          <button
            type="button"
            className="error-boundary-button"
            onClick={() => window.location.reload()}
          >
            Reload
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
