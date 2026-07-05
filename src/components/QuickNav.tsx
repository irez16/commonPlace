import { Link } from 'react-router-dom';
import { useProfileStatus } from '../hooks/useProfileStatus';
import { useNotifications } from '../hooks/useNotifications';

// Temporary, minimal nav for testing while logged in. A proper account
// menu (avatar, settings, etc.) is deferred until that's designed
// properly — this just gets you back to your profile from anywhere, plus
// a quiet unread count for In Common notifications.
export default function QuickNav() {
  const { username } = useProfileStatus();
  const { unreadCount } = useNotifications();

  if (!username) return null;

  return (
    <div style={{ position: 'fixed', top: 12, left: 12, zIndex: 1000 }}>
      <Link to={`/@${username}`}>My profile</Link>
      {' · '}
      <Link to="/notifications">In Common{unreadCount > 0 && ` (${unreadCount})`}</Link>
    </div>
  );
}
