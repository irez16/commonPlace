import { Link } from 'react-router-dom';
import { useFeed } from '../hooks/useFeed';
import SaveToListButton from './SaveToListButton';

export default function FeedPage() {
  const { loading, needsAuth, error, entries, viewerId } = useFeed();

  if (needsAuth) {
    return (
      <p>
        <Link to="/">Log in</Link> to see your feed.
      </p>
    );
  }

  if (loading) return <p>Loading feed…</p>;
  if (error) return <p style={{ color: 'crimson' }}>{error}</p>;

  if (entries.length === 0) {
    return <p>Nothing here yet. Follow people to see what they're reading, watching, and listening to.</p>;
  }

  return (
    <ul>
      {entries.map((entry) => (
        <li key={entry.id}>
          <div>
            <Link to={`/${entry.author.username}`}>{entry.author.name}</Link>
          </div>
          <strong>{entry.title}</strong>
          {entry.creator && ` — ${entry.creator}`}
          <div>
            <span>{entry.media_type}</span> · <span>{entry.consumed_date}</span>
            {entry.rating && (
              <>
                {' '}
                · <span>{entry.rating}/5</span>
              </>
            )}
          </div>
          {entry.note && <p>{entry.note}</p>}
          {entry.url && (
            <a href={entry.url} target="_blank" rel="noreferrer">
              View source
            </a>
          )}
          {viewerId && <SaveToListButton viewerId={viewerId} entry={entry} />}
        </li>
      ))}
    </ul>
  );
}
