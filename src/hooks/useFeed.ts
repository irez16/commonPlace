import { useEffect, useState, useCallback } from 'react';
import { supabase } from '../lib/supabaseClient';
import type { LedgerEntry, Profile } from '../types';

export interface FeedEntry extends LedgerEntry {
  author: Pick<Profile, 'id' | 'username' | 'name' | 'avatar_url' | 'ledger_accent'>;
}

interface FeedState {
  loading: boolean;
  needsAuth: boolean;
  error: string | null;
  entries: FeedEntry[];
  viewerId: string | null;
}

export function useFeed(): FeedState {
  const [loading, setLoading] = useState(true);
  const [needsAuth, setNeedsAuth] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [entries, setEntries] = useState<FeedEntry[]>([]);
  const [viewerId, setViewerId] = useState<string | null>(null);

  const fetchFeed = useCallback(async () => {
    setLoading(true);
    setError(null);

    const {
      data: { user: currentUser },
    } = await supabase.auth.getUser();

    if (!currentUser) {
      setLoading(false);
      setNeedsAuth(true);
      return;
    }

    setViewerId(currentUser.id);

    // Step 1: who does the current user follow?
    const { data: followRows, error: followError } = await supabase
      .from('follows')
      .select('followee_id')
      .eq('follower_id', currentUser.id);

    if (followError) {
      setLoading(false);
      setError(followError.message);
      return;
    }

    const followeeIds = (followRows ?? []).map((row) => row.followee_id as string);

    if (followeeIds.length === 0) {
      setLoading(false);
      setEntries([]);
      return;
    }

    // Step 2: ledger entries from those users, newest consumed first.
    // (Two-step fetch instead of a join, matching useFollowList — keeps
    // each query inside a single table's RLS policy.)
    const { data: entryRows, error: entryError } = await supabase
      .from('ledger_entries')
      .select('*')
      .in('user_id', followeeIds)
      .order('consumed_date', { ascending: false })
      .order('created_at', { ascending: false });

    if (entryError) {
      setLoading(false);
      setError(entryError.message);
      return;
    }

    const rows = (entryRows ?? []) as LedgerEntry[];

    if (rows.length === 0) {
      setLoading(false);
      setEntries([]);
      return;
    }

    // Step 3: resolve authors for the entries we got back.
    const authorIds = Array.from(new Set(rows.map((e) => e.user_id)));

    const { data: profileRows, error: profileError } = await supabase
      .from('public_profiles')
      .select('id, username, name, avatar_url, ledger_accent')
      .in('id', authorIds);

    setLoading(false);

    if (profileError) {
      setError(profileError.message);
      return;
    }

    const profileById = new Map(
      (profileRows ?? []).map((p) => [p.id as string, p as Profile])
    );

    const feedEntries: FeedEntry[] = rows
      .filter((entry) => profileById.has(entry.user_id))
      .map((entry) => ({
        ...entry,
        author: profileById.get(entry.user_id)!,
      }));

    setEntries(feedEntries);
  }, []);

  useEffect(() => {
    fetchFeed();
  }, [fetchFeed]);

  return { loading, needsAuth, error, entries, viewerId };
}
