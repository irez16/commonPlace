import { useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient';
import { useFollowCounts } from '../hooks/useFollowCounts';
import AddLedgerEntry from './AddLedgerEntry';
import LedgerList from './LedgerList';
import AddWantToConsume from './AddWantToConsume';
import WantToConsumeList from './WantToConsumeList';

interface MainAppProps {
  userId: string;
}

export default function MainApp({ userId }: MainAppProps) {
  const [ledgerRefreshKey, setLedgerRefreshKey] = useState(0);
  const [wantRefreshKey, setWantRefreshKey] = useState(0);
  const { loading: countsLoading, followerCount, followingCount } = useFollowCounts(userId);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    window.location.reload();
  };

  return (
    <div>
      <button type="button" onClick={handleLogout}>
        Log out
      </button>

      <div>
        <Link to="/following">
          Following{!countsLoading && ` (${followingCount})`}
        </Link>
        {' · '}
        <Link to="/followers">
          Followers{!countsLoading && ` (${followerCount})`}
        </Link>
      </div>

      <AddLedgerEntry
        userId={userId}
        onAdded={() => setLedgerRefreshKey((k) => k + 1)}
      />

      <hr />

      <LedgerList userId={userId} refreshKey={ledgerRefreshKey} />

      <hr />

      <AddWantToConsume
        userId={userId}
        onAdded={() => setWantRefreshKey((k) => k + 1)}
      />

      <hr />

      <WantToConsumeList
        userId={userId}
        refreshKey={wantRefreshKey}
        onPromoted={() => setLedgerRefreshKey((k) => k + 1)}
      />
    </div>
  );
}
