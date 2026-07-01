import { useEffect, useState, useCallback } from 'react';
import { supabase } from '../lib/supabaseClient';
import type { Profile } from '../types';

interface FollowListState {
  loading: boolean;
  needsAuth: boolean;
  error: string | null;
  profiles: Profile[];
}

// direction 'following' → people the current user follows
// direction 'followers' → people who follow the current user
export function useFollowList(direction: 'following' | 'followers'): FollowListState {
  const [loading, setLoading] = useState(true);
  const [needsAuth, setNeedsAuth] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [profiles, setProfiles] = useState<Profile[]>([]);

  const fetchList = useCallback(async () => {
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

    // Step 1: get the relevant side of the follow graph.
    const followsQuery =
      direction === 'following'
        ? supabase.from('follows').select('followee_id').eq('follower_id', currentUser.id)
        : supabase.from('follows').select('follower_id').eq('followee_id', currentUser.id);

    const { data: followRows, error: followError } = await followsQuery;

    if (followError) {
      setLoading(false);
      setError(followError.message);
      return;
    }

    const ids = (followRows ?? []).map((row: { followee_id: string } | { follower_id: string }) =>
      direction === 'following'
        ? (row as { followee_id: string }).followee_id
        : (row as { follower_id: string }).follower_id
    );

    if (ids.length === 0) {
      setLoading(false);
      setProfiles([]);
      return;
    }

    // Step 2: resolve those ids into displayable profiles.
    const { data: profileRows, error: profileError } = await supabase
      .from('public_profiles')
      .select('*')
      .in('id', ids);

    setLoading(false);

    if (profileError) {
      setError(profileError.message);
      return;
    }

    setProfiles((profileRows ?? []) as Profile[]);
  }, [direction]);

  useEffect(() => {
    fetchList();
  }, [fetchList]);

  return { loading, needsAuth, error, profiles };
}
