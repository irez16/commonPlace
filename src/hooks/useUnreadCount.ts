import { useCallback, useEffect, useRef, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient';

// Fired by anything that changes read state (e.g. useNotifications'
// markAsRead) so the bell badge can refetch without a page reload.
export const NOTIFICATIONS_CHANGED_EVENT = 'commonplace:notifications-changed';

interface UnreadCountState {
  loading: boolean;
  error: string | null;
  count: number;
}

// Lightweight unread count for the bell badge: a head-only count query
// rather than loading every notification. Takes the signed-in user's id
// from the caller (QuickNav already holds useProfileStatus, so this
// avoids a second auth listener + profile query); pass null when logged
// out or before the profile exists and the count is 0. Refetches when
// that id changes, on every route change, when the app comes back to
// the foreground, and whenever NOTIFICATIONS_CHANGED_EVENT fires.
export function useUnreadCount(userId: string | null): UnreadCountState {
  const { pathname } = useLocation();
  // The latest settled result, tagged with the user it belongs to. State
  // is only ever written after the request resolves (never synchronously
  // inside the effect), and loading/count are derived from it below.
  const [result, setResult] = useState<{
    userId: string;
    count: number;
    error: string | null;
  } | null>(null);
  // Only the latest request is allowed to write state, so a slow
  // response can't overwrite a newer one.
  const requestSeq = useRef(0);

  const fetchCount = useCallback(async () => {
    const seq = ++requestSeq.current;
    if (!userId) return;

    const { count: unread, error: countError } = await supabase
      .from('in_common_notifications')
      .select('id', { count: 'exact', head: true })
      .eq('recipient_id', userId)
      .eq('is_read', false);

    if (seq !== requestSeq.current) return;

    setResult((prev) => ({
      userId,
      // On a transient failure keep the last known count for this user
      // rather than making the badge vanish.
      count: countError
        ? prev?.userId === userId
          ? prev.count
          : 0
        : unread ?? 0,
      error: countError ? countError.message : null,
    }));
  }, [userId]);

  useEffect(() => {
    fetchCount();
  }, [fetchCount, pathname]);

  useEffect(() => {
    const onVisibility = () => {
      if (document.visibilityState === 'visible') fetchCount();
    };
    const onChanged = () => fetchCount();

    document.addEventListener('visibilitychange', onVisibility);
    window.addEventListener(NOTIFICATIONS_CHANGED_EVENT, onChanged);
    return () => {
      document.removeEventListener('visibilitychange', onVisibility);
      window.removeEventListener(NOTIFICATIONS_CHANGED_EVENT, onChanged);
    };
  }, [fetchCount]);

  if (!userId) return { loading: false, error: null, count: 0 };

  const current = result?.userId === userId ? result : null;
  return {
    loading: current === null,
    error: current?.error ?? null,
    count: current?.count ?? 0,
  };
}
