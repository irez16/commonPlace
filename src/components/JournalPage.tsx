import { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { usePublicProfile } from '../hooks/usePublicProfile';
import AddPassage from './AddPassage';
import PassageList from './PassageList';

export default function JournalPage() {
  const { handle } = useParams<{ handle: string }>();
  const username = handle?.startsWith('@') ? handle.slice(1) : undefined;
  const { loading, notFound, error, profile, isOwnProfile } = usePublicProfile(username);

  // Same pattern as the profile page: governs add/delete controls, owner
  // only, always resets to view on a fresh load.
  const [isEditingContent, setIsEditingContent] = useState(false);
  const [journalRefreshKey, setJournalRefreshKey] = useState(0);

  if (username && loading) return <p>Loading journal…</p>;

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

  const contentEditable = isOwnProfile && isEditingContent;

  return (
    <div>
      <div>
        <Link to={`/@${profile.username}`}>@{profile.username}</Link>
        <h1>Commonplace Journal</h1>
      </div>

      {isOwnProfile && (
        <button type="button" onClick={() => setIsEditingContent((v) => !v)}>
          {isEditingContent ? 'Done' : 'Edit'}
        </button>
      )}

      {contentEditable && (
        <AddPassage userId={profile.id} onAdded={() => setJournalRefreshKey((k) => k + 1)} />
      )}

      <PassageList userId={profile.id} refreshKey={journalRefreshKey} readOnly={!contentEditable} />
    </div>
  );
}
