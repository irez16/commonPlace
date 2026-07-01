import { useState, FormEvent } from 'react';
import { supabase } from '../lib/supabaseClient';

interface LoginProps {
  onComplete?: () => void;
  onSwitchToSignUp?: () => void;
}

export default function Login({ onComplete, onSwitchToSignUp }: LoginProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const { error: signInError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    setLoading(false);

    if (signInError) {
      if (signInError.message.toLowerCase().includes('invalid login')) {
        setError("Incorrect email or password — or your email isn't confirmed yet.");
      } else {
        setError(signInError.message);
      }
      return;
    }

    onComplete?.();
  };

  return (
    <form onSubmit={handleSubmit}>
      <h2>Log in</h2>
      {error && <p style={{ color: 'crimson' }}>{error}</p>}
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
      <button type="submit" disabled={loading}>
        {loading ? 'Logging in…' : 'Log in'}
      </button>

      {onSwitchToSignUp && (
        <p>
          Don't have an account?{' '}
          <button type="button" onClick={onSwitchToSignUp}>
            Sign up
          </button>
        </p>
      )}
    </form>
  );
}
