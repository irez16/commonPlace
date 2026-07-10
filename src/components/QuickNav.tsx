import { Link } from 'react-router-dom';
import { useProfileStatus } from '../hooks/useProfileStatus';
import { useNotifications } from '../hooks/useNotifications';
import './QuickNav.css';

// Top-right icon nav: notifications (In Common), then Settings as the
// rightmost icon.
export default function QuickNav() {
  const { username } = useProfileStatus();
  const { unreadCount } = useNotifications();

  if (!username) return null;

  return (
    <div className="quick-nav">
      <Link className="quick-nav-icon" to="/notifications" aria-label="In Common notifications">
        <svg width="19" height="19">
          <use href="/icons.svg#icon-bell" />
        </svg>
        {unreadCount > 0 && (
          <span className="quick-nav-badge">{unreadCount > 9 ? '9+' : unreadCount}</span>
        )}
      </Link>
      <Link className="quick-nav-icon" to="/settings" aria-label="Settings">
        <svg width="19" height="19">
          <use href="/icons.svg#icon-gear" />
        </svg>
      </Link>
    </div>
  );
}
