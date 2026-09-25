import { Link } from 'react-router-dom';
import { useNotifications } from '../hooks/useNotifications';
import { useProfileStatus } from '../hooks/useProfileStatus';
import Avatar from './Avatar';
import ClampedText from './ClampedText';
import PageStatus from './PageStatus';
import { resolveLedgerAccent } from '../lib/ledgerAccent';
import { useDocumentTitle } from '../hooks/useDocumentTitle';
import './NotificationsPage.css';

export default function NotificationsPage() {
  useDocumentTitle('In Common');
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

  if (loading) return <PageStatus>Loading notifications…</PageStatus>;
  if (error) return <PageStatus tone="error">{error}</PageStatus>;

  return (
    <div className="notifications-page">
      <h1>In Common</h1>

      {notifications.length === 0 ? (
        <p className="notifications-status">
          Nothing here yet. You'll hear about it when someone you follow clips a passage
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

              <div className="notification-card-body">
                <Avatar
                  name={n.otherUser?.name ?? '?'}
                  url={n.otherUser?.avatar_url}
                  accentColor={resolveLedgerAccent(n.otherUser?.ledger_accent)}
                  size={34}
                />
                <div className="notification-card-text">
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
                        {n.entryCreator ? ` by ${n.entryCreator}` : ''}
                      </>
                    )}
                    :
                  </p>

                  {/* Long clips are cut to a few lines; Read more opens
                      the full clip (your own, in your Journal). */}
                  {n.clippedText && (
                    <ClampedText
                      className="notification-quote"
                      text={n.clippedText}
                      more={
                        username ? (
                          <Link
                            className="clamped-text-more notification-read-more hit-area"
                            to={`/@${username}/journal/${n.my_passage_id}`}
                          >
                            Read more
                          </Link>
                        ) : null
                      }
                    />
                  )}
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
