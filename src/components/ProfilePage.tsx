import { useState, type CSSProperties } from 'react';
import { useParams, Link } from 'react-router-dom';
import { usePublicProfile } from '../hooks/usePublicProfile';
import { resolveLedgerAccent } from '../lib/ledgerAccent';
import ProfileHeader from './ProfileHeader';
import AddLedgerEntry from './AddLedgerEntry';
import LedgerList from './LedgerList';
import PinPicker from './PinPicker';
import AddWantToConsume from './AddWantToConsume';
import WantToConsumeList from './WantToConsumeList';
import type { Profile } from '../types';
import './ProfilePage.css';

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

  const pageStyle: CSSProperties & Record<string, string> = {
    '--ledger-accent': resolveLedgerAccent(displayedProfile.ledger_accent),
  };

  return (
    <div className="profile-page" style={pageStyle}>
      <ProfileHeader
        profile={displayedProfile}
        isOwnProfile={isOwnProfile}
        viewerId={viewerId}
        onProfileUpdated={setLiveProfile}
      />

      <hr className="profile-divider" />

      <div className="profile-section">
        <div className="profile-section-header">
          <div className="profile-section-header-left">
            <h2>Ledger</h2>
            {isOwnProfile && (
              <PinPicker
                userId={displayedProfile.id}
                pinnedId={displayedProfile.pinned_ledger_entry_id}
                onPinnedChanged={(id) =>
                  setLiveProfile({ ...displayedProfile, pinned_ledger_entry_id: id })
                }
              />
            )}
          </div>
          {isOwnProfile && (
            <button
              type="button"
              className="profile-section-edit-toggle"
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
          username={displayedProfile.username}
          refreshKey={ledgerRefreshKey}
          readOnly={!contentEditable}
          pinnedId={displayedProfile.pinned_ledger_entry_id}
          onPinnedChanged={(id) =>
            setLiveProfile({ ...displayedProfile, pinned_ledger_entry_id: id })
          }
        />

        <h2 style={{ marginTop: 20 }}>Want to Consume</h2>

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
        />
      </div>

      <hr className="profile-divider" />

      <Link className="profile-journal-link" to={`/@${displayedProfile.username}/journal`}>
        {isOwnProfile ? 'Your Commonplace Journal' : `${displayedProfile.name}'s Commonplace Journal`}
      </Link>
    </div>
  );
}
