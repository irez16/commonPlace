import { Link } from 'react-router-dom';
import { useNotifications } from '../hooks/useNotifications';

export default function NotificationsPage() {
  const { loading, needsAuth, error, notifications, markAsRead } = useNotifications();

  if (needsAuth) {
    return (
      <p>
        <Link to="/">Log in</Link> to see your notifications.
      </p>
    );
  }

  if (loading) return <p>Loading notifications…</p>;
  if (error) return <p style={{ color: 'crimson' }}>{error}</p>;

  if (notifications.length === 0) {
    return <p>Nothing here yet — you'll hear about it when someone you follow clips a passage you've already saved.</p>;
  }

  return (
    <div>
      <h1>In Common</h1>
      <ul>
        {notifications.map((n) => (
          <li key={n.id} onClick={() => !n.is_read && markAsRead(n.id)}>
            <p>
              {n.otherUser ? (
                <Link to={`/@${n.otherUser.username}`}>{n.otherUser.name}</Link>
              ) : (
                'Someone you follow'
              )}{' '}
              also clipped this
              {n.entryTitle && (
                <>
                  {' '}
                  from <strong>{n.entryTitle}</strong>
                  {n.entryCreator ? ` — ${n.entryCreator}` : ''}
                </>
              )}
              :
            </p>
            {n.clippedText && <blockquote>{n.clippedText}</blockquote>}
            {!n.is_read && <span aria-label="Unread">●</span>}
          </li>
        ))}
      </ul>
    </div>
  );
}
