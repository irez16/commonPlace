import { useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { useProfileStatus } from '../hooks/useProfileStatus';
import SignUp from './SignUp';
import Login from './Login';
import ForgotPasswordRequest from './ForgotPasswordRequest';
import './AppForm.css';
import './AuthPage.css';

export default function Dashboard() {
  const { loading, error, user, hasProfile, username, refresh } = useProfileStatus();
  const [authView, setAuthView] = useState<'login' | 'signup' | 'forgot'>('login');

  // While the profile-load error screen is up, retry once automatically
  // when the browser reports the connection is back.
  const showLoadError = !!user && !!error;
  useEffect(() => {
    if (!showLoadError) return;
    window.addEventListener('online', refresh, { once: true });
    return () => window.removeEventListener('online', refresh);
    // refresh is a new function each render; only re-subscribe when the
    // error screen appears or goes away.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showLoadError]);

  if (loading) return <p className="auth-page-hint">Loading…</p>;

  // Not logged in at all → show login, signup, or the forgot-password
  // request form, toggling between them.
  if (!user) {
    if (authView === 'signup') {
      return (
        <div className="auth-page">
          <div className="auth-page-wordmark">commonplace</div>
          <SignUp onComplete={refresh} />
          <p className="auth-page-switch">
            Already have an account?{' '}
            <button type="button" onClick={() => setAuthView('login')}>
              Log in
            </button>
          </p>
        </div>
      );
    }
    if (authView === 'forgot') {
      return (
        <div className="auth-page">
          <div className="auth-page-wordmark">commonplace</div>
          <ForgotPasswordRequest onBackToLogin={() => setAuthView('login')} />
        </div>
      );
    }
    return (
      <div className="auth-page">
        <div className="auth-page-wordmark">commonplace</div>
        <Login
          onComplete={refresh}
          onSwitchToSignUp={() => setAuthView('signup')}
          onForgotPassword={() => setAuthView('forgot')}
        />
      </div>
    );
  }

  // Logged in but the profile lookup failed (usually offline) → don't
  // guess. Say so and offer a retry rather than showing the profile step.
  if (error) {
    const offline = typeof navigator !== 'undefined' && navigator.onLine === false;
    return (
      <div className="auth-page">
        <div className="auth-page-wordmark">commonplace</div>
        <div className="app-form" role="alert">
          <h2>{offline ? "You're offline" : "Couldn't load your profile"}</h2>
          <p className="auth-page-hint">
            {offline
              ? 'Connect to the internet and try again.'
              : 'Something went wrong reaching CommonPlace. Please try again.'}
          </p>
          <button type="button" className="app-form-submit" onClick={refresh}>
            Retry
          </button>
        </div>
      </div>
    );
  }

  // Logged in but no profile row → orphaned account, finish setup
  if (!hasProfile) {
    return (
      <div className="auth-page">
        <div className="auth-page-wordmark">commonplace</div>
        <SignUp startAtProfileStep onComplete={refresh} />
      </div>
    );
  }

  // Logged in with a complete profile → there's no separate "dashboard"
  // view anymore. Your own /@username page IS the app; it just has an
  // Edit toggle you and only you can see.
  return <Navigate to={`/@${username}`} replace />;
}
