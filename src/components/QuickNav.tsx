import { Link } from 'react-router-dom';
import { useProfileStatus } from '../hooks/useProfileStatus';
import { useNotifications } from '../hooks/useNotifications';
import './QuickNav.css';

// Top-corner notifications link. Used to also have a "My profile" link
// here, but the new bottom TabBar's Ledger tab covers that now — this
// is just the one thing the tab bar doesn't have a slot for.
export default function QuickNav() {
  const { username } = useProfileStatus();
  const { unreadCount } = useNotifications();

  if (!username) return null;

  return (
    <div className="quick-nav">
      <Link to="/notifications">
        In Common{unreadCount > 0 && ` (${unreadCount})`}
      </Link>
    </div>
  );
}
