import { useEffect, useState } from 'react';
import type { User } from '@supabase/supabase-js';
import { supabase } from '../lib/supabaseClient';

interface ProfileStatus {
  loading: boolean;
  user: User | null;
  hasProfile: boolean;
  username: string | null;
}

// Returns { loading, user, hasProfile, username }
// Use this at the app root to decide whether to route someone into the
// "complete your profile" step rather than the main app.
export function useProfileStatus(): ProfileStatus {
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<User | null>(null);
  const [hasProfile, setHasProfile] = useState(false);
  const [username, setUsername] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    const check = async () => {
      const {
        data: { user: currentUser },
      } = await supabase.auth.getUser();

      if (!isMounted) return;

      if (!currentUser) {
        setUser(null);
        setHasProfile(false);
        setUsername(null);
        setLoading(false);
        return;
      }

      const { data: profile } = await supabase
        .from('profiles')
        .select('id, username')
        .eq('id', currentUser.id)
        .maybeSingle();

      if (!isMounted) return;

      setUser(currentUser);
      setHasProfile(!!profile);
      setUsername(profile?.username ?? null);
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
  }, []);

  return { loading, user, hasProfile, username };
}
