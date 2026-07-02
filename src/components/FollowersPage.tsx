import { Link } from 'react-router-dom';
import { useFollowList } from '../hooks/useFollowList';

export default function FollowersPage() {
  const { loading, needsAuth, error, profiles } = useFollowList('followers');

  if (loading) return <p>Loading…</p>;

  if (needsAuth) {
    return (
      <div>
        <p>Log in to see your followers.</p>
        <Link to="/">Go home</Link>
      </div>
    );
  }

  if (error) return <p style={{ color: 'crimson' }}>{error}</p>;

  return (
    <div>
      <h1>Followers</h1>
      <Link to="/">Back to your profile</Link>
      {profiles.length === 0 ? (
        <p>No followers yet.</p>
      ) : (
        <ul>
          {profiles.map((p) => (
            <li key={p.id}>
              <Link to={`/@${p.username}`}>
                {p.name} (@{p.username})
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
