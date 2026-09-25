import { Link } from 'react-router-dom';
import { useFollowList } from '../hooks/useFollowList';
import { useProfileStatus } from '../hooks/useProfileStatus';
import { useDocumentTitle } from '../hooks/useDocumentTitle';
import Avatar from './Avatar';
import PageStatus from './PageStatus';
import { resolveLedgerAccent } from '../lib/ledgerAccent';
import './FollowListPage.css';

export default function FollowersPage() {
  useDocumentTitle('Followers');
  const { loading, needsAuth, error, profiles } = useFollowList('followers');
  const { username } = useProfileStatus();

  if (loading) return <PageStatus>Loading…</PageStatus>;

  if (needsAuth) {
    return (
      <div className="follow-list-page">
        <p className="follow-list-status">Log in to see your followers.</p>
        <Link to="/" className="hit-area">Go home</Link>
      </div>
    );
  }

  if (error) return <PageStatus tone="error">{error}</PageStatus>;

  return (
    <div className="follow-list-page">
      {username && (
        <Link className="follow-list-breadcrumb hit-area" to={`/@${username}`}>
          ← @{username}
        </Link>
      )}
      <h1>Followers</h1>
      {profiles.length === 0 ? (
        <p className="follow-list-status">No followers yet.</p>
      ) : (
        <ul className="follow-list">
          {profiles.map((p) => (
            <li key={p.id}>
              <Link className="follow-list-row" to={`/@${p.username}`}>
                <Avatar
                  name={p.name}
                  url={p.avatar_url}
                  accentColor={resolveLedgerAccent(p.ledger_accent)}
                  size={40}
                />
                <div className="follow-list-row-text">
                  <div className="follow-list-row-name">{p.name}</div>
                  <div className="follow-list-row-username">@{p.username}</div>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
