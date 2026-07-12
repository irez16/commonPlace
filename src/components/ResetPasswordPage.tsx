import { useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient';
import './AppForm.css';
import './AuthPage.css';

// This is where the link in the reset-password email points. Supabase's
// client automatically reads the recovery token out of the URL and
// establishes a temporary session for it (detectSessionInUrl, on by
// default) — we don't handle the token ourselves, we just check whether
// that session shows up, either already present on mount or via the
// PASSWORD_RECOVERY auth event if the URL processing finishes slightly
// after this component mounts.
export default function ResetPasswordPage() {
  const navigate = useNavigate();
  const [status, setStatus] = useState<'checking' | 'ready' | 'invalid'>('checking');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [done, setDone] = useState(false);

  useEffect(() => {
    let cancelled = false;

    supabase.auth.getSession().then(({ data }) => {
      if (!cancelled && data.session) setStatus('ready');
    });

    const { data: listener } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY') setStatus('ready');
    });

    // Give the URL-based session detection a moment before concluding
    // the link is actually invalid, rather than flashing an error first.
    const timeout = setTimeout(() => {
      if (!cancelled) setStatus((s) => (s === 'checking' ? 'invalid' : s));
    }, 3000);

    return () => {
      cancelled = true;
      listener.subscription.unsubscribe();
      clearTimeout(timeout);
    };
  }, []);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);

    if (password.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }
    if (password !== confirmPassword) {
      setError("Passwords don't match.");
      return;
    }

    setSaving(true);
    const { error: updateError } = await supabase.auth.updateUser({ password });
    setSaving(false);

    if (updateError) {
      setError(updateError.message);
      return;
    }

    setDone(true);
  };

  if (status === 'checking') {
    return (
      <div className="auth-page">
        <p className="auth-page-hint">Checking your reset link…</p>
      </div>
    );
  }

  if (status === 'invalid') {
    return (
      <div className="auth-page">
        <div className="app-form">
          <h2>This link isn't valid</h2>
          <p className="auth-page-hint">
            It may have expired, or already been used. Request a new one from the login
            screen.
          </p>
          <button type="button" className="app-form-submit" onClick={() => navigate('/')}>
            Back to log in
          </button>
        </div>
      </div>
    );
  }

  if (done) {
    return (
      <div className="auth-page">
        <div className="app-form">
          <h2>Password updated</h2>
          <p className="auth-page-hint">
            You're all set — head back and log in with your new password.
          </p>
          <button type="button" className="app-form-submit" onClick={() => navigate('/')}>
            Continue
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="auth-page">
      <form className="app-form" onSubmit={handleSubmit}>
        <h2>Set a new password</h2>
        {error && <p className="app-form-error">{error}</p>}
        <input
          type="password"
          placeholder="New password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />
        <input
          type="password"
          placeholder="Confirm new password"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          required
        />
        <button type="submit" className="app-form-submit" disabled={saving}>
          {saving ? 'Saving…' : 'Set password'}
        </button>
      </form>
    </div>
  );
}
