import { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { usePublicProfile } from '../hooks/usePublicProfile';
import ProfileHeader from './ProfileHeader';
import AddLedgerEntry from './AddLedgerEntry';
import LedgerList from './LedgerList';
import AddWantToConsume from './AddWantToConsume';
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

  // Governs both the Ledger and Want to Consume sections at once — owner
  // only, and always resets to false on a fresh page load, so your own
  // page defaults to looking exactly like anyone else's visit.
  const [isEditingContent, setIsEditingContent] = useState(false);
  const [ledgerRefreshKey, setLedgerRefreshKey] = useState(0);
  const [wantRefreshKey, setWantRefreshKey] = useState(0);

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

  // liveProfile lets the header (and the pin, once set) reflect an edit
  // immediately without re-fetching the whole profile from the server.
  const displayedProfile = liveProfile || profile;
  const contentEditable = isOwnProfile && isEditingContent;

  return (
    <div>
      <ProfileHeader
        profile={displayedProfile}
        isOwnProfile={isOwnProfile}
        viewerId={viewerId}
        onProfileUpdated={setLiveProfile}
      />

      <hr />

      <div>
        <h2>Ledger</h2>
        {isOwnProfile && (
          <button
            type="button"
            onClick={() => setIsEditingContent((v) => !v)}
          >
            {isEditingContent ? 'Done' : 'Edit'}
          </button>
        )}
      </div>

      {contentEditable && (
        <AddLedgerEntry
          userId={displayedProfile.id}
          onAdded={() => setLedgerRefreshKey((k) => k + 1)}
        />
      )}

      <LedgerList
        userId={displayedProfile.id}
        refreshKey={ledgerRefreshKey}
        readOnly={!contentEditable}
      />

      <hr />

      <h2>Want to Consume</h2>

      {contentEditable && (
        <AddWantToConsume
          userId={displayedProfile.id}
          onAdded={() => setWantRefreshKey((k) => k + 1)}
        />
      )}

      <WantToConsumeList
        userId={displayedProfile.id}
        refreshKey={wantRefreshKey}
        readOnly={!contentEditable}
        onPromoted={() => setLedgerRefreshKey((k) => k + 1)}
        pinnedId={displayedProfile.pinned_want_to_consume_id}
        onPinnedChanged={(id) =>
          setLiveProfile({ ...displayedProfile, pinned_want_to_consume_id: id })
        }
      />
    </div>
  );
}
