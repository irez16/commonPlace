import { Link } from 'react-router-dom';
import { useFollowList } from '../hooks/useFollowList';
import { useProfileStatus } from '../hooks/useProfileStatus';
import './FollowListPage.css';

export default function FollowingPage() {
  const { loading, needsAuth, error, profiles } = useFollowList('following');
  const { username } = useProfileStatus();

  if (loading) return <div className="follow-list-page"><p className="follow-list-status">Loading…</p></div>;

  if (needsAuth) {
    return (
      <div className="follow-list-page">
        <p className="follow-list-status">Log in to see who you're following.</p>
        <Link to="/">Go home</Link>
      </div>
    );
  }

  if (error) return <div className="follow-list-page"><p className="follow-list-status" style={{ color: 'crimson' }}>{error}</p></div>;

  return (
    <div className="follow-list-page">
      {username && (
        <Link className="follow-list-breadcrumb" to={`/@${username}`}>
          ← @{username}
        </Link>
      )}
      <h1>Following</h1>
      {profiles.length === 0 ? (
        <p className="follow-list-status">You're not following anyone yet.</p>
      ) : (
        <ul className="follow-list">
          {profiles.map((p) => (
            <li key={p.id}>
              <Link className="follow-list-row" to={`/@${p.username}`}>
                <div className="follow-list-row-name">{p.name}</div>
                <div className="follow-list-row-username">@{p.username}</div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
