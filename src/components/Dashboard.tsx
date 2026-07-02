import { useState } from 'react';
import { Navigate } from 'react-router-dom';
import { useProfileStatus } from '../hooks/useProfileStatus';
import SignUp from './SignUp';
import Login from './Login';

export default function Dashboard() {
  const { loading, user, hasProfile, username } = useProfileStatus();
  const [authView, setAuthView] = useState<'login' | 'signup'>('login');

  if (loading) return <p>Loading…</p>;

  // Not logged in at all → show login or signup, toggle between them
  if (!user) {
    if (authView === 'signup') {
      return (
        <>
          <SignUp onComplete={() => window.location.reload()} />
          <p>
            Already have an account?{' '}
            <button type="button" onClick={() => setAuthView('login')}>
              Log in
            </button>
          </p>
        </>
      );
    }
    return (
      <Login
        onComplete={() => window.location.reload()}
        onSwitchToSignUp={() => setAuthView('signup')}
      />
    );
  }

  // Logged in but no profile row → orphaned account, finish setup
  if (!hasProfile) {
    return <SignUp startAtProfileStep onComplete={() => window.location.reload()} />;
  }

  // Logged in with a complete profile → there's no separate "dashboard"
  // view anymore. Your own /@username page IS the app; it just has an
  // Edit toggle you and only you can see.
  return <Navigate to={`/@${username}`} replace />;
}
