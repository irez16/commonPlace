import { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { usePublicProfile } from '../hooks/usePublicProfile';
import { useDocumentTitle } from '../hooks/useDocumentTitle';
import AddPassage from './AddPassage';
import PassageList from './PassageList';
import './JournalPage.css';

export default function JournalPage() {
  const { handle } = useParams<{ handle: string }>();
  const username = handle?.startsWith('@') ? handle.slice(1) : undefined;
  const { loading, notFound, error, profile, isOwnProfile } = usePublicProfile(username);
  useDocumentTitle(profile ? `${profile.name}'s Journal` : 'Journal');

  // Same pattern as the profile page: governs add/delete controls, owner
  // only, always resets to view on a fresh load.
  const [isEditingContent, setIsEditingContent] = useState(false);
  const [journalRefreshKey, setJournalRefreshKey] = useState(0);

  if (username && loading) return <p className="journal-page-status">Loading journal…</p>;

  if (!username || notFound) {
    return (
      <div className="journal-page">
        <p className="journal-page-status">No profile found for {handle}.</p>
        <Link to="/">Go home</Link>
      </div>
    );
  }

  if (error) return <p className="journal-page-status" style={{ color: 'crimson' }}>{error}</p>;
  if (!profile) return null;

  const contentEditable = isOwnProfile && isEditingContent;

  return (
    <div className="journal-page">
      <Link className="journal-page-breadcrumb" to={`/@${profile.username}`}>
        ← @{profile.username}
      </Link>

      <div className="journal-page-header">
        <h1>Commonplace Journal</h1>
        {isOwnProfile && (
          <button
            type="button"
            className="journal-page-edit-toggle"
            onClick={() => setIsEditingContent((v) => !v)}
          >
            {isEditingContent ? 'Done' : 'Edit'}
          </button>
        )}
      </div>

      {contentEditable && (
        <AddPassage userId={profile.id} onAdded={() => setJournalRefreshKey((k) => k + 1)} />
      )}

      <PassageList
        userId={profile.id}
        username={profile.username}
        refreshKey={journalRefreshKey}
        readOnly={!contentEditable}
        ledgerAccent={profile.ledger_accent}
        journalCoverColor={profile.journal_cover_color}
        journalFont={profile.journal_font}
      />
    </div>
  );
}
