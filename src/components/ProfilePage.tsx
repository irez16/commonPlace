import { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { usePublicProfile } from '../hooks/usePublicProfile';
import ProfileHeader from './ProfileHeader';
import LedgerList from './LedgerList';
import WantToConsumeList from './WantToConsumeList';
import type { Profile } from '../types';

export default function ProfilePage() {
  // useParams reads whatever the router captured from the URL. Our route
  // is defined as "/@:username", so this pulls out just the "username" part.
  const { username } = useParams<{ username: string }>();
  const { loading, notFound, error, profile, isOwnProfile } = usePublicProfile(username);
  const [liveProfile, setLiveProfile] = useState<Profile | null>(null);

  if (loading) return <p>Loading profile…</p>;

  if (notFound) {
    return (
      <div>
        <p>No profile found for @{username}.</p>
        <Link to="/">Go home</Link>
      </div>
    );
  }

  if (error) return <p style={{ color: 'crimson' }}>{error}</p>;
  if (!profile) return null;

  // liveProfile lets the header reflect an edit immediately without
  // re-fetching the whole profile from the server.
  const displayedProfile = liveProfile || profile;

  return (
    <div>
      <ProfileHeader
        profile={displayedProfile}
        isOwnProfile={isOwnProfile}
        onProfileUpdated={setLiveProfile}
      />

      <hr />

      <h2>Ledger</h2>
      <LedgerList userId={displayedProfile.id} refreshKey={0} readOnly />

      <hr />

      <h2>Want to Consume</h2>
      <WantToConsumeList userId={displayedProfile.id} refreshKey={0} readOnly />
    </div>
  );
}
