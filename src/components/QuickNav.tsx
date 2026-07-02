import { Link } from 'react-router-dom';
import { useProfileStatus } from '../hooks/useProfileStatus';

// Temporary, minimal nav for testing while logged in. A proper account
// menu (avatar, settings, etc.) is deferred until that's designed
// properly — this just gets you back to your profile from anywhere.
export default function QuickNav() {
  const { username } = useProfileStatus();

  if (!username) return null;

  return (
    <div style={{ position: 'fixed', top: 12, left: 12, zIndex: 1000 }}>
      <Link to={`/@${username}`}>My profile</Link>
    </div>
  );
}
