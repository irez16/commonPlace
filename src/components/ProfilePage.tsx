import { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { usePublicProfile } from '../hooks/usePublicProfile';
import ProfileHeader from './ProfileHeader';
import LedgerList from './LedgerList';
import WantToConsumeList from './WantToConsumeList';
import type { Profile } from '../types';

export default function ProfilePage() {
  // React Router params must be a whole path segment — it can't mix a
  // literal "@" with a param within the same segment. So the route is
  // "/:handle" and we capture the whole thing (e.g. "@iRezonate"), then
  // strip the "@" ourselves before using it as the username to look up.
  const { handle } = useParams<{ handle: string }>();
  const username = handle?.startsWith('@') ? handle.slice(1) : undefined;
  const { loading, notFound, error, profile, isOwnProfile, viewerId } = usePublicProfile(username);
  const [liveProfile, setLiveProfile] = useState<Profile | null>(null);

  if (username && loading) return <p>Loading profile…</p>;

  if (!username || notFound) {
    return (
      <div>
        <p>No profile found for {handle}.</p>
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
        viewerId={viewerId}
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
