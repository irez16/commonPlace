import { useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { useFeed } from '../hooks/useFeed';
import { usePeopleSearch } from '../hooks/usePeopleSearch';
import SaveToListButton from './SaveToListButton';
import Avatar from './Avatar';
import { MEDIA_TYPE_LABELS } from '../types';
import { truncateNote } from '../lib/text';
import { resolveLedgerAccent } from '../lib/ledgerAccent';
import { useDocumentTitle } from '../hooks/useDocumentTitle';
import './FeedPage.css';

function formatConsumedDate(dateStr: string): string {
  const date = new Date(`${dateStr}T12:00:00`);
  return new Intl.DateTimeFormat('en-US', { month: 'short', year: 'numeric' }).format(date);
}

function PeopleResults({ search }: { search: ReturnType<typeof usePeopleSearch> }) {
  if (search.loading) return <p className="feed-status">Searching…</p>;
  if (search.error) {
    return (
      <p className="feed-status" style={{ color: 'crimson' }}>
        {search.error}
      </p>
    );
  }
  if (search.results.length === 0) return <p className="feed-status">No one found.</p>;

  return (
    <ul className="feed-people-list" aria-label="People">
      {search.results.map((person) => (
        <li key={person.id}>
          <Link className="feed-person" to={`/@${person.username}`}>
            {/* Each person's avatar uses their own Ledger accent, same
                rule as the feed cards. */}
            <Avatar
              name={person.name}
              url={person.avatar_url}
              accentColor={resolveLedgerAccent(person.ledger_accent)}
            />
            <span className="feed-card-header-text">
              <span className="feed-card-author-name">{person.name}</span>
              <span className="feed-person-username">@{person.username}</span>
            </span>
          </Link>
        </li>
      ))}
    </ul>
  );
}

export default function FeedPage() {
  useDocumentTitle('Feed');
  const { loading, needsAuth, error, entries, viewerId } = useFeed();
  const [searchQuery, setSearchQuery] = useState('');
  const search = usePeopleSearch(searchQuery, viewerId);
  const searchInputRef = useRef<HTMLInputElement>(null);

  if (needsAuth) {
    return (
      <div className="feed-page">
        <p className="feed-status">
          <Link to="/">Log in</Link> to see your feed.
        </p>
      </div>
    );
  }

  return (
    <div className="feed-page">
      <h1>Feed</h1>

      <input
        ref={searchInputRef}
        className="feed-search-input"
        type="search"
        value={searchQuery}
        onChange={(e) => setSearchQuery(e.target.value)}
        placeholder="Search people by name or @username"
        aria-label="Search people by name or username"
        autoComplete="off"
        autoCapitalize="none"
        autoCorrect="off"
        spellCheck={false}
      />

      {search.active ? (
        <PeopleResults search={search} />
      ) : loading ? (
        <p className="feed-status">Loading feed…</p>
      ) : error ? (
        <p className="feed-status" style={{ color: 'crimson' }}>{error}</p>
      ) : entries.length === 0 ? (
        <div className="feed-empty">
          <p className="feed-status">Your Feed shows what people you follow log.</p>
          <button
            type="button"
            className="feed-empty-action"
            onClick={() => searchInputRef.current?.focus()}
          >
            Find people
          </button>
        </div>
      ) : (
        <ul className="feed-list">
          {entries.map((entry) => {
            // Each post's avatar reflects its author's own chosen
            // Ledger accent — not the viewer's — same rule used
            // everywhere else in the app.
            const authorAccent = resolveLedgerAccent(entry.author.ledger_accent);

            return (
              <li key={entry.id} className="feed-card">
                <Link className="feed-card-header" to={`/@${entry.author.username}`}>
                  <Avatar
                    name={entry.author.name}
                    url={entry.author.avatar_url}
                    accentColor={authorAccent}
                  />
                  <span className="feed-card-header-text">
                    <span className="feed-card-author-name">{entry.author.name}</span>
                    <span className="feed-card-header-meta">
                      {MEDIA_TYPE_LABELS[entry.media_type]} · {formatConsumedDate(entry.consumed_date)}
                      {entry.rating ? ` · ${entry.rating}/5` : ''}
                    </span>
                  </span>
                </Link>

                <Link
                  className="feed-card-link-wrapper"
                  to={`/@${entry.author.username}/ledger/${entry.id}`}
                >
                  <h3 className="feed-card-title">{entry.title}</h3>
                  {entry.creator && <div className="feed-card-creator">{entry.creator}</div>}
                  {entry.note && <p className="feed-card-note">{truncateNote(entry.note)}</p>}
                </Link>

                <div className="feed-card-footer">
                  {viewerId && <SaveToListButton viewerId={viewerId} entry={entry} />}
                  {entry.url && (
                    <a
                      className="feed-card-link"
                      href={entry.url}
                      target="_blank"
                      rel="noreferrer"
                    >
                      View source
                    </a>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
