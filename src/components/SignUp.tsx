import { useRef, useState } from 'react';
import type { FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient';
import Captcha, { type CaptchaHandle } from './Captcha';
import './AppForm.css';
import './AuthPage.css';

const USERNAME_REGEX = /^[a-zA-Z0-9_]{3,20}$/;

interface SignUpProps {
  onComplete?: () => void;
  startAtProfileStep?: boolean;
}

export default function SignUp({ onComplete, startAtProfileStep = false }: SignUpProps) {
  const [step, setStep] = useState<'account' | 'profile'>(
    startAtProfileStep ? 'profile' : 'account'
  );
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [username, setUsername] = useState('');
  const [name, setName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [captchaToken, setCaptchaToken] = useState<string | null>(null);
  const captchaRef = useRef<CaptchaHandle>(null);

  const handleAccountSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const { data, error: signUpError } = await supabase.auth.signUp({
      email,
      password,
      options: captchaToken ? { captchaToken } : undefined,
    });

    captchaRef.current?.reset();
    setLoading(false);

    if (signUpError) {
      setError(signUpError.message);
      return;
    }

    if (!data.session) {
      setError(
        'Check your email to confirm your account, then log in to finish setting up your profile.'
      );
      return;
    }

    setStep('profile');
  };

  const handleProfileSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!USERNAME_REGEX.test(username)) {
      setError('Username must be 3-20 characters: letters, numbers, underscores only.');
      return;
    }
    if (!name.trim()) {
      setError('Name is required.');
      return;
    }

    setLoading(true);

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      setLoading(false);
      setError('Session expired, please log in again.');
      return;
    }

    const { data: existing, error: lookupError } = await supabase
      .from('profiles')
      .select('id')
      .eq('username', username)
      .maybeSingle();

    if (lookupError) {
      setLoading(false);
      setError('Something went wrong checking that username. Try again.');
      return;
    }
    if (existing) {
      setLoading(false);
      setError('That username is taken, try another.');
      return;
    }

    const { error: insertError } = await supabase.from('profiles').insert({
      id: user.id,
      username,
      name: name.trim(),
    });

    setLoading(false);

    if (insertError) {
      if (insertError.code === '23505') {
        setError('That username was just taken, try another.');
      } else {
        setError(insertError.message);
      }
      return;
    }

    onComplete?.();
  };

  if (step === 'account') {
    return (
      <form className="app-form" onSubmit={handleAccountSubmit}>
        <h2>Create your account</h2>
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
          minLength={6}
          required
        />

        <Captcha ref={captchaRef} onToken={setCaptchaToken} />

        <button type="submit" className="app-form-submit" disabled={loading}>
          {loading ? 'Creating account…' : 'Continue'}
        </button>

        <p className="auth-page-legal-hint">
          By creating an account, you agree to the{' '}
          <Link to="/legal#terms" target="_blank" rel="noreferrer">
            Terms
          </Link>{' '}
          and{' '}
          <Link to="/legal#privacy" target="_blank" rel="noreferrer">
            Privacy Policy
          </Link>
          .
        </p>
      </form>
    );
  }

  return (
    <form className="app-form" onSubmit={handleProfileSubmit}>
      <h2>Set up your profile</h2>
      {error && <p className="app-form-error">{error}</p>}
      <input
        type="text"
        placeholder="Username"
        value={username}
        onChange={(e) => setUsername(e.target.value)}
        required
      />
      <input
        type="text"
        placeholder="Name"
        value={name}
        onChange={(e) => setName(e.target.value)}
        required
      />
      <button type="submit" className="app-form-submit" disabled={loading}>
        {loading ? 'Saving…' : 'Finish'}
      </button>
    </form>
  );
}
