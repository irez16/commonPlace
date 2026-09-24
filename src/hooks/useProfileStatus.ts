import { useEffect, useState } from 'react';
import { isAuthRetryableFetchError, type User } from '@supabase/supabase-js';
import { authStorageKey, clearCachedRefreshFailure, supabase } from '../lib/supabaseClient';

// The user from the session auth-js has saved in localStorage, without
// asking the auth server. Used only when the server can't be reached, so a
// signed-in person who launches the app offline (even with an expired
// access token) sees the offline screen instead of the login form.
function readStoredUser(): User | null {
  try {
    const raw = window.localStorage.getItem(authStorageKey);
    if (!raw) return null;
    const stored = JSON.parse(raw) as { user?: User | null } | null;
    return stored?.user?.id ? stored.user : null;
  } catch {
    return null;
  }
}

const OFFLINE_ERROR = 'You appear to be offline';

interface ProfileStatus {
  loading: boolean;
  // Set when the profile lookup failed (offline, network, server error).
  // Cleared by the next successful check or refresh().
  error: string | null;
  user: User | null;
  hasProfile: boolean;
  username: string | null;
  refresh: () => void;
}

// Returns { loading, error, user, hasProfile, username, refresh }
// Use this at the app root to decide whether to route someone into the
// "complete your profile" step rather than the main app.
export function useProfileStatus(): ProfileStatus {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [hasProfile, setHasProfile] = useState(false);
  const [username, setUsername] = useState<string | null>(null);

  const [refreshKey, setRefreshKey] = useState(0);
  // Show the loading state while re-checking so a Retry button gets
  // visible feedback (set here, in the caller's event, not in the effect).
  const refresh = () => {
    // A retry must really retry: drop auth-js's cached refresh failure so
    // an expired token gets refreshed now that we may be back online.
    clearCachedRefreshFailure();
    setLoading(true);
    setRefreshKey((k) => k + 1);
  };

  useEffect(() => {
    let isMounted = true;

    const check = async () => {
      // Offline with a stored session: go straight to the offline screen.
      // Without this, getSession() on an expired token spends ~30s retrying
      // the refresh and then reports no session, which looked like being
      // signed out. No await before this point, so the listener's
      // setLoading(true) and this setLoading(false) land in one render.
      if (typeof navigator !== 'undefined' && navigator.onLine === false) {
        const storedUser = readStoredUser();
        if (storedUser) {
          setUser(storedUser);
          setError(OFFLINE_ERROR);
          setLoading(false);
          return;
        }
      }

      // getSession() reads the locally stored session rather than asking
      // the auth server (as getUser() does), so an installed app launched
      // offline still knows who's signed in. This is only UI state: RLS
      // still verifies the token server-side on every real request.
      const {
        data: { session },
        error: sessionError,
      } = await supabase.auth.getSession();

      if (!isMounted) return;

      // A network failure while refreshing an expired token is not a
      // sign-out: auth-js keeps the session in storage. Show the
      // offline/Retry screen for the stored user instead of Login.
      if (!session && sessionError && isAuthRetryableFetchError(sessionError)) {
        const storedUser = readStoredUser();
        if (storedUser) {
          setUser(storedUser);
          setError(sessionError.message || OFFLINE_ERROR);
          setLoading(false);
          return;
        }
      }

      const currentUser = session?.user ?? null;

      if (!currentUser) {
        setError(null);
        setUser(null);
        setHasProfile(false);
        setUsername(null);
        setLoading(false);
        return;
      }

      let profile: { id: string; username: string | null } | null = null;
      let profileError: string | null;
      try {
        const result = await supabase
          .from('profiles')
          .select('id, username')
          .eq('id', currentUser.id)
          .maybeSingle()
          // postgrest-js otherwise retries a failed GET 3 times with
          // backoff (~7s of Loading before the offline screen). The
          // Retry button and the 'online' auto-retry cover this instead.
          .retry(false);
        profile = result.data;
        profileError = result.error ? result.error.message : null;
      } catch (err) {
        profileError = err instanceof Error ? err.message : 'Profile lookup failed';
      }

      if (!isMounted) return;

      setUser(currentUser);
      // A failed lookup (e.g. offline) is not the same as "no profile row".
      // Keep whatever we last knew instead of bouncing the person into the
      // finish-your-profile step, and expose the failure as `error` so the
      // root route can show an offline/Retry screen.
      if (profileError) {
        setError(profileError);
      } else {
        setError(null);
        setHasProfile(!!profile);
        setUsername(profile?.username ?? null);
      }
      setLoading(false);
    };

    check();

    // Re-check whenever auth state changes (login, logout, token refresh)
    const { data: listener } = supabase.auth.onAuthStateChange(() => {
      setLoading(true);
      check();
    });

    return () => {
      isMounted = false;
      listener.subscription.unsubscribe();
    };
  }, [refreshKey]);

  return { loading, error, user, hasProfile, username, refresh };
}
