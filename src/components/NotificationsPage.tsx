import { Link } from 'react-router-dom';
import { useNotifications } from '../hooks/useNotifications';
import { useProfileStatus } from '../hooks/useProfileStatus';
import './NotificationsPage.css';

export default function NotificationsPage() {
  const { loading, needsAuth, error, notifications, markAsRead } = useNotifications();
  const { username } = useProfileStatus();

  if (needsAuth) {
    return (
      <div className="notifications-page">
        <p className="notifications-status">
          <Link to="/">Log in</Link> to see your notifications.
        </p>
      </div>
    );
  }

  if (loading) return <div className="notifications-page"><p className="notifications-status">Loading notifications…</p></div>;
  if (error) return <div className="notifications-page"><p className="notifications-status" style={{ color: 'crimson' }}>{error}</p></div>;

  return (
    <div className="notifications-page">
      <h1>In Common</h1>

      {notifications.length === 0 ? (
        <p className="notifications-status">
          Nothing here yet — you'll hear about it when someone you follow clips a passage
          you've already saved.
        </p>
      ) : (
        <ul className="notifications-list">
          {notifications.map((n) => (
            <li
              key={n.id}
              className={`notification-card${!n.is_read ? ' is-unread' : ''}`}
              onClick={() => !n.is_read && markAsRead(n.id)}
            >
              {!n.is_read && <span className="notification-unread-dot" aria-label="Unread" />}

              <p className="notification-line">
                {n.otherUser ? (
                  <Link to={`/@${n.otherUser.username}`} onClick={(e) => e.stopPropagation()}>
                    {n.otherUser.name}
                  </Link>
                ) : (
                  'Someone you follow'
                )}{' '}
                also clipped this
                {n.entryTitle && (
                  <>
                    {' '}
                    from{' '}
                    {username && n.entryId ? (
                      <Link
                        to={`/@${username}/ledger/${n.entryId}`}
                        onClick={(e) => e.stopPropagation()}
                      >
                        <strong>{n.entryTitle}</strong>
                      </Link>
                    ) : (
                      <strong>{n.entryTitle}</strong>
                    )}
                    {n.entryCreator ? ` — ${n.entryCreator}` : ''}
                  </>
                )}
                :
              </p>

              {n.clippedText && <p className="notification-quote">{n.clippedText}</p>}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
