import { useRef, useState } from 'react';
import type { FormEvent } from 'react';
import { supabase } from '../lib/supabaseClient';
import Captcha, { type CaptchaHandle } from './Captcha';
import './AppForm.css';
import './AuthPage.css';

interface ForgotPasswordRequestProps {
  onBackToLogin?: () => void;
}

// Step one of the reset flow: collect the email, ask Supabase to send a
// reset link. Step two (actually setting the new password) happens on
// whatever page that emailed link points to — see ResetPasswordPage.
export default function ForgotPasswordRequest({ onBackToLogin }: ForgotPasswordRequestProps) {
  const [email, setEmail] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [captchaToken, setCaptchaToken] = useState<string | null>(null);
  const captchaRef = useRef<CaptchaHandle>(null);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const { error: resetError } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
      captchaToken: captchaToken ?? undefined,
    });

    captchaRef.current?.reset();
    setLoading(false);

    // Deliberately not distinguishing "no account with that email" from
    // success — confirming which emails have accounts is an information
    // leak. Supabase's client already doesn't error on unknown emails
    // for this call, so this mostly covers network/rate-limit/captcha
    // failures.
    if (resetError) {
      setError(resetError.message);
      return;
    }

    setSent(true);
  };

  if (sent) {
    return (
      <div className="app-form">
        <h2>Check your email</h2>
        <p className="auth-page-hint">
          If there's an account for {email}, a password reset link is on its way. It'll
          expire after a while, so use it soon.
        </p>
        {onBackToLogin && (
          <button type="button" className="app-form-secondary-button" onClick={onBackToLogin}>
            Back to log in
          </button>
        )}
      </div>
    );
  }

  return (
    <form className="app-form" onSubmit={handleSubmit}>
      <h2>Reset your password</h2>
      <p className="auth-page-hint">
        Enter your email and we'll send you a link to set a new password.
      </p>
      {error && <p className="app-form-error">{error}</p>}
      <input
        type="email"
        placeholder="Email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        required
      />

      <Captcha ref={captchaRef} onToken={setCaptchaToken} />

      <button type="submit" className="app-form-submit" disabled={loading}>
        {loading ? 'Sending…' : 'Send reset link'}
      </button>
      {onBackToLogin && (
        <p className="auth-page-switch">
          <button type="button" onClick={onBackToLogin}>
            Back to log in
          </button>
        </p>
      )}
    </form>
  );
}
