import { useEffect, useState, useCallback } from 'react';
import { supabase } from '../lib/supabaseClient';
import type { FeedEntry } from '../hooks/useFeed';
import './SaveToListButton.css';

interface SaveToListButtonProps {
  viewerId: string;
  entry: FeedEntry;
}

// Saves a feed entry into the viewer's own Want to Consume list. This is
// the only interaction the chronological feed allows (no likes/comments).
export default function SaveToListButton({ viewerId, entry }: SaveToListButtonProps) {
  const [isSaved, setIsSaved] = useState(false);
  const [loading, setLoading] = useState(true);
  const [working, setWorking] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const checkStatus = useCallback(async () => {
    setLoading(true);

    const { data, error: fetchError } = await supabase
      .from('want_to_consume')
      .select('id')
      .eq('user_id', viewerId)
      .eq('source_ledger_entry_id', entry.id)
      .maybeSingle();

    setLoading(false);

    if (fetchError) {
      setError(fetchError.message);
      return;
    }

    setIsSaved(!!data);
  }, [viewerId, entry.id]);

  useEffect(() => {
    checkStatus();
  }, [checkStatus]);

  const save = async () => {
    setWorking(true);
    setError(null);

    const { error: insertError } = await supabase.from('want_to_consume').insert({
      user_id: viewerId,
      media_type: entry.media_type,
      title: entry.title,
      creator: entry.creator,
      url: entry.url,
      note: null,
      is_public: true,
      source_ledger_entry_id: entry.id,
    });

    setWorking(false);

    if (insertError) {
      setError(insertError.message);
      return;
    }

    setIsSaved(true);
  };

  if (loading) return <button type="button" className="save-to-list-button" disabled>…</button>;

  return (
    <div>
      <button
        type="button"
        className={`save-to-list-button${isSaved ? ' is-saved' : ''}`}
        onClick={save}
        disabled={isSaved || working}
      >
        {working ? '…' : isSaved ? 'Saved' : 'Save to list'}
      </button>
      {error && <p className="save-to-list-error">{error}</p>}
    </div>
  );
}
