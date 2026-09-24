import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string;

// The localStorage key auth-js keeps the session under. This is the same
// value supabase-js uses by default (sb-<project-ref>-auth-token); it's set
// explicitly so the app can read the stored session itself when offline
// (see useProfileStatus) without depending on a guessed key.
export const authStorageKey = `sb-${new URL(supabaseUrl).hostname.split('.')[0]}-auth-token`;

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: { storageKey: authStorageKey },
});

// auth-js (2.108) remembers a failed token refresh for 60 seconds and hands
// that same failure to every getSession() in the meantime without trying
// the network again. After an offline spell that means Retry, or the
// automatic retry when the connection comes back, would keep failing for
// up to a minute. There's no public API to reset it, so this clears the
// (protected) cache directly. It's only called for an explicit re-check;
// if a future auth-js drops the field, this is a harmless no-op.
export function clearCachedRefreshFailure(): void {
  const auth = supabase.auth as unknown as { lastRefreshFailure?: unknown };
  if ('lastRefreshFailure' in auth) auth.lastRefreshFailure = null;
}
