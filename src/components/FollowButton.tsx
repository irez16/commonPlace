import { useEffect, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient';

interface FollowButtonProps {
  viewerId: string | null;
  targetUserId: string;
}

export default function FollowButton({ viewerId, targetUserId }: FollowButtonProps) {
  const [isFollowing, setIsFollowing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [working, setWorking] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const checkStatus = useCallback(async () => {
    if (!viewerId) {
      setLoading(false);
      return;
    }

    setLoading(true);

    const { data, error: fetchError } = await supabase
      .from('follows')
      .select('follower_id')
      .eq('follower_id', viewerId)
      .eq('followee_id', targetUserId)
      .maybeSingle();

    setLoading(false);

    if (fetchError) {
      setError(fetchError.message);
      return;
    }

    setIsFollowing(!!data);
  }, [viewerId, targetUserId]);

  useEffect(() => {
    checkStatus();
  }, [checkStatus]);

  const follow = async () => {
    if (!viewerId) return;
    setWorking(true);
    setError(null);

    const { error: insertError } = await supabase
      .from('follows')
      .insert({ follower_id: viewerId, followee_id: targetUserId });

    setWorking(false);

    if (insertError) {
      setError(insertError.message);
      return;
    }

    setIsFollowing(true);
  };

  const unfollow = async () => {
    if (!viewerId) return;
    setWorking(true);
    setError(null);

    const { error: deleteError } = await supabase
      .from('follows')
      .delete()
      .eq('follower_id', viewerId)
      .eq('followee_id', targetUserId);

    setWorking(false);

    if (deleteError) {
      setError(deleteError.message);
      return;
    }

    setIsFollowing(false);
  };

  // Not logged in — point them to log in rather than hiding the concept
  // of following entirely.
  if (!viewerId) {
    return <Link to="/">Log in to follow</Link>;
  }

  if (loading) return <button type="button" disabled>…</button>;

  return (
    <div>
      <button
        type="button"
        onClick={isFollowing ? unfollow : follow}
        disabled={working}
      >
        {working ? '…' : isFollowing ? 'Unfollow' : 'Follow'}
      </button>
      {error && <p style={{ color: 'crimson' }}>{error}</p>}
    </div>
  );
}
