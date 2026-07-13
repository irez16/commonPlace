import { Component } from 'react';
import type { ErrorInfo, ReactNode } from 'react';
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
    // No error-reporting service wired up (e.g. Sentry) — this is the
    // only record of the crash right now, visible in the browser
    // console rather than sent anywhere.
    console.error('Uncaught error:', error, info.componentStack);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="error-boundary">
          <h1>Something went wrong</h1>
          <p>
            The page hit an unexpected error. Reloading usually fixes it — if it keeps
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
