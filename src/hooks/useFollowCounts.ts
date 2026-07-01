import { useEffect, useState, useCallback } from 'react';
import { supabase } from '../lib/supabaseClient';

interface FollowCounts {
  loading: boolean;
  followerCount: number;
  followingCount: number;
}

// Counts are only ever shown to the profile owner (per product decision —
// no public engagement metrics), so this hook is used on the dashboard,
// never on the public profile page.
export function useFollowCounts(userId: string | undefined): FollowCounts {
  const [loading, setLoading] = useState(true);
  const [followerCount, setFollowerCount] = useState(0);
  const [followingCount, setFollowingCount] = useState(0);

  const fetchCounts = useCallback(async () => {
    if (!userId) {
      setLoading(false);
      return;
    }

    setLoading(true);

    const [followers, following] = await Promise.all([
      supabase
        .from('follows')
        .select('follower_id', { count: 'exact', head: true })
        .eq('followee_id', userId),
      supabase
        .from('follows')
        .select('followee_id', { count: 'exact', head: true })
        .eq('follower_id', userId),
    ]);

    setLoading(false);
    setFollowerCount(followers.count ?? 0);
    setFollowingCount(following.count ?? 0);
  }, [userId]);

  useEffect(() => {
    fetchCounts();
  }, [fetchCounts]);

  return { loading, followerCount, followingCount };
}
