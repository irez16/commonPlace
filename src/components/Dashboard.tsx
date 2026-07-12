import { useState } from 'react';
import { Navigate } from 'react-router-dom';
import { useProfileStatus } from '../hooks/useProfileStatus';
import SignUp from './SignUp';
import Login from './Login';
import ForgotPasswordRequest from './ForgotPasswordRequest';
import './AuthPage.css';

export default function Dashboard() {
  const { loading, user, hasProfile, username } = useProfileStatus();
  const [authView, setAuthView] = useState<'login' | 'signup' | 'forgot'>('login');

  if (loading) return <p className="auth-page-hint">Loading…</p>;

  // Not logged in at all → show login, signup, or the forgot-password
  // request form, toggling between them.
  if (!user) {
    if (authView === 'signup') {
      return (
        <div className="auth-page">
          <div className="auth-page-wordmark">commonplace</div>
          <SignUp onComplete={() => window.location.reload()} />
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
          onComplete={() => window.location.reload()}
          onSwitchToSignUp={() => setAuthView('signup')}
          onForgotPassword={() => setAuthView('forgot')}
        />
      </div>
    );
  }

  // Logged in but no profile row → orphaned account, finish setup
  if (!hasProfile) {
    return (
      <div className="auth-page">
        <div className="auth-page-wordmark">commonplace</div>
        <SignUp startAtProfileStep onComplete={() => window.location.reload()} />
      </div>
    );
  }

  // Logged in with a complete profile → there's no separate "dashboard"
  // view anymore. Your own /@username page IS the app; it just has an
  // Edit toggle you and only you can see.
  return <Navigate to={`/@${username}`} replace />;
}
