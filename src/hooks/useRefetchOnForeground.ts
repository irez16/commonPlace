import { useEffect, useRef } from 'react';

// How long the app has to have been in the background before coming back
// counts as a "return" worth refetching for. Quick app switches (copying
// a link, answering a message) shouldn't trigger a burst of requests.
const MIN_HIDDEN_MS = 30_000;

const FOREGROUND_EVENT = 'commonplace:foreground';

// One document-level listener for the whole app, so every data hook
// agrees on how long the app was hidden.
let listening = false;
let hiddenAt: number | null = null;

function ensureListening() {
  if (listening || typeof document === 'undefined') return;
  listening = true;
  if (document.visibilityState === 'hidden') hiddenAt = Date.now();
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') {
      hiddenAt = Date.now();
      return;
    }
    const wasHiddenFor = hiddenAt === null ? 0 : Date.now() - hiddenAt;
    hiddenAt = null;
    if (wasHiddenFor >= MIN_HIDDEN_MS) window.dispatchEvent(new Event(FOREGROUND_EVENT));
  });
}

// Calls `refetch` when the app comes back to the foreground after being
// in the background for at least 30 seconds. Callers pass a background
// refetch: one that keeps the data on screen (no loading state) and
// swaps it in when the new copy arrives.
export function useRefetchOnForeground(refetch: () => void) {
  const refetchRef = useRef(refetch);
  useEffect(() => {
    refetchRef.current = refetch;
  }, [refetch]);

  useEffect(() => {
    ensureListening();
    const onForeground = () => refetchRef.current();
    window.addEventListener(FOREGROUND_EVENT, onForeground);
    return () => window.removeEventListener(FOREGROUND_EVENT, onForeground);
  }, []);
}
