import { useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient';
import AddLedgerEntry from './AddLedgerEntry';
import LedgerList from './LedgerList';
import AddWantToConsume from './AddWantToConsume';
import WantToConsumeList from './WantToConsumeList';

interface MainAppProps {
  userId: string;
  username: string | null;
}

export default function MainApp({ userId, username }: MainAppProps) {
  const [ledgerRefreshKey, setLedgerRefreshKey] = useState(0);
  const [wantRefreshKey, setWantRefreshKey] = useState(0);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    window.location.reload();
  };

  return (
    <div>
      <button type="button" onClick={handleLogout}>
        Log out
      </button>
      {username && <Link to={`/@${username}`}>View your profile</Link>}

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
