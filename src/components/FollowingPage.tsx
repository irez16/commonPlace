import { Link } from 'react-router-dom';
import { useFollowList } from '../hooks/useFollowList';

export default function FollowingPage() {
  const { loading, needsAuth, error, profiles } = useFollowList('following');

  if (loading) return <p>Loading…</p>;

  if (needsAuth) {
    return (
      <div>
        <p>Log in to see who you're following.</p>
        <Link to="/">Go home</Link>
      </div>
    );
  }

  if (error) return <p style={{ color: 'crimson' }}>{error}</p>;

  return (
    <div>
      <h1>Following</h1>
      <Link to="/">Back to dashboard</Link>
      {profiles.length === 0 ? (
        <p>You're not following anyone yet.</p>
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
