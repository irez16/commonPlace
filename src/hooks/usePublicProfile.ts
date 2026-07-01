import { useEffect, useState, useCallback } from 'react';
import { supabase } from '../lib/supabaseClient';
import type { Profile } from '../types';

interface PublicProfileState {
  loading: boolean;
  notFound: boolean;
  error: string | null;
  profile: Profile | null;
  isOwnProfile: boolean;
}

// Looks up a profile by username. Deliberately does NOT fetch ledger or
// want-to-consume data itself — LedgerList and WantToConsumeList already
// know how to fetch by userId, so ProfilePage passes profile.id into those
// existing components (with readOnly=true) instead of duplicating the fetch.
export function usePublicProfile(username: string | undefined): PublicProfileState {
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [isOwnProfile, setIsOwnProfile] = useState(false);

  const fetchProfile = useCallback(async () => {
    if (!username) {
      setLoading(false);
      setNotFound(true);
      return;
    }

    setLoading(true);
    setError(null);
    setNotFound(false);

    const { data: profileData, error: profileError } = await supabase
      .from('public_profiles')
      .select('*')
      .eq('username', username)
      .maybeSingle();

    if (profileError) {
      setLoading(false);
      setError(profileError.message);
      return;
    }

    if (!profileData) {
      setLoading(false);
      setNotFound(true);
      return;
    }

    const typedProfile = profileData as Profile;

    const {
      data: { user: currentUser },
    } = await supabase.auth.getUser();

    setLoading(false);
    setProfile(typedProfile);
    setIsOwnProfile(currentUser?.id === typedProfile.id);
  }, [username]);

  useEffect(() => {
    fetchProfile();
  }, [fetchProfile]);

  return { loading, notFound, error, profile, isOwnProfile };
}
