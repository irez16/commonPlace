import type { CSSProperties } from 'react';
import { Link } from 'react-router-dom';
import { useFeed } from '../hooks/useFeed';
import SaveToListButton from './SaveToListButton';
import { MEDIA_TYPE_LABELS } from '../types';
import { truncateNote } from '../lib/text';
import { resolveLedgerAccent } from '../lib/ledgerAccent';
import './FeedPage.css';

function formatConsumedDate(dateStr: string): string {
  const date = new Date(`${dateStr}T12:00:00`);
  return new Intl.DateTimeFormat('en-US', { month: 'short', year: 'numeric' }).format(date);
}

function initials(name: string): string {
  return name.trim().charAt(0).toUpperCase() || '?';
}

export default function FeedPage() {
  const { loading, needsAuth, error, entries, viewerId } = useFeed();

  if (needsAuth) {
    return (
      <div className="feed-page">
        <p className="feed-status">
          <Link to="/">Log in</Link> to see your feed.
        </p>
      </div>
    );
  }

  if (loading) return <div className="feed-page"><p className="feed-status">Loading feed…</p></div>;
  if (error) return <div className="feed-page"><p className="feed-status" style={{ color: 'crimson' }}>{error}</p></div>;

  return (
    <div className="feed-page">
      <h1>Feed</h1>

      {entries.length === 0 ? (
        <p className="feed-status">
          Nothing here yet. Follow people to see what they're reading, watching, and
          listening to.
        </p>
      ) : (
        <ul className="feed-list">
          {entries.map((entry) => {
            // Each post's avatar and byline reflect its author's chosen
            // Ledger accent — not the viewer's — same rule used
            // everywhere else in the app.
            const cardStyle: CSSProperties & Record<string, string> = {
              '--feed-card-accent': resolveLedgerAccent(entry.author.ledger_accent),
            };

            return (
              <li key={entry.id} className="feed-card" style={cardStyle}>
                <Link className="feed-card-header" to={`/@${entry.author.username}`}>
                  <span className="feed-card-avatar">{initials(entry.author.name)}</span>
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
