import { useRef, useState } from 'react';
import type { FormEvent } from 'react';
import { supabase } from '../lib/supabaseClient';
import Captcha, { type CaptchaHandle } from './Captcha';
import './AppForm.css';
import './AuthPage.css';

interface LoginProps {
  onComplete?: () => void;
  onSwitchToSignUp?: () => void;
  onForgotPassword?: () => void;
}

export default function Login({ onComplete, onSwitchToSignUp, onForgotPassword }: LoginProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [captchaToken, setCaptchaToken] = useState<string | null>(null);
  const captchaRef = useRef<CaptchaHandle>(null);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const { error: signInError } = await supabase.auth.signInWithPassword({
      email,
      password,
      options: captchaToken ? { captchaToken } : undefined,
    });

    captchaRef.current?.reset();
    setLoading(false);

    if (signInError) {
      if (signInError.message.toLowerCase().includes('invalid login')) {
        setError("Incorrect email or password, or your email isn't confirmed yet.");
      } else {
        setError(signInError.message);
      }
      return;
    }

    onComplete?.();
  };

  return (
    <form className="app-form" onSubmit={handleSubmit}>
      <h2>Log in</h2>
      {error && <p className="app-form-error">{error}</p>}
      <input
        type="email"
        placeholder="Email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        required
      />
      <input
        type="password"
        placeholder="Password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        required
      />

      <Captcha ref={captchaRef} onToken={setCaptchaToken} />

      {onForgotPassword && (
        <button type="button" className="auth-page-forgot-link" onClick={onForgotPassword}>
          Forgot password?
        </button>
      )}

      <button type="submit" className="app-form-submit" disabled={loading}>
        {loading ? 'Logging in…' : 'Log in'}
      </button>

      {onSwitchToSignUp && (
        <p className="auth-page-switch">
          Don't have an account?{' '}
          <button type="button" onClick={onSwitchToSignUp}>
            Sign up
          </button>
        </p>
      )}
    </form>
  );
}
