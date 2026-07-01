import { useEffect, useState, useCallback } from 'react';
import { supabase } from '../lib/supabaseClient';
import type { WantToConsumeItem } from '../types';

interface WantToConsumeListProps {
  userId: string;
  refreshKey: number;
  onPromoted?: () => void;
}

interface PromoteDraft {
  consumed_date: string;
  rating: string;
  note: string;
}

export default function WantToConsumeList({
  userId,
  refreshKey,
  onPromoted,
}: WantToConsumeListProps) {
  const [items, setItems] = useState<WantToConsumeItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [promotingId, setPromotingId] = useState<string | null>(null);
  const [promoteDraftId, setPromoteDraftId] = useState<string | null>(null);
  const [promoteDraft, setPromoteDraft] = useState<PromoteDraft>({
    consumed_date: new Date().toISOString().slice(0, 10),
    rating: '',
    note: '',
  });

  const fetchItems = useCallback(async () => {
    setLoading(true);
    setError(null);

    const { data, error: fetchError } = await supabase
      .from('want_to_consume')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    setLoading(false);

    if (fetchError) {
      setError(fetchError.message);
      return;
    }

    setItems(data as WantToConsumeItem[]);
  }, [userId]);

  useEffect(() => {
    fetchItems();
  }, [fetchItems, refreshKey]);

  const openPromoteForm = (item: WantToConsumeItem) => {
    setPromoteDraftId(item.id);
    setPromoteDraft({
      consumed_date: new Date().toISOString().slice(0, 10),
      rating: '',
      note: '',
    });
  };

  const cancelPromote = () => {
    setPromoteDraftId(null);
  };

  const confirmPromote = async (item: WantToConsumeItem) => {
    setPromotingId(item.id);
    setError(null);

    const { error: insertError } = await supabase
      .from('ledger_entries')
      .insert({
        user_id: userId,
        media_type: item.media_type,
        title: item.title,
        creator: item.creator,
        url: item.url,
        consumed_date: promoteDraft.consumed_date,
        rating: promoteDraft.rating ? Number(promoteDraft.rating) : null,
        note: promoteDraft.note.trim() || null,
      });

    if (insertError) {
      setPromotingId(null);
      setError(insertError.message);
      return;
    }

    const { error: deleteError } = await supabase
      .from('want_to_consume')
      .delete()
      .eq('id', item.id);

    setPromotingId(null);
    setPromoteDraftId(null);

    if (deleteError) {
      setError(
        'Added to your ledger, but failed to remove from this list: ' +
          deleteError.message
      );
    }

    setItems((prev) => prev.filter((i) => i.id !== item.id));
    onPromoted?.();
  };

  const deleteItem = async (id: string) => {
    if (!window.confirm("Remove this from your list? This can't be undone.")) return;

    setDeletingId(id);
    setError(null);

    const { error: deleteError } = await supabase
      .from('want_to_consume')
      .delete()
      .eq('id', id);

    setDeletingId(null);

    if (deleteError) {
      setError(deleteError.message);
      return;
    }

    setItems((prev) => prev.filter((i) => i.id !== id));
  };

  if (loading) return <p>Loading your list…</p>;
  if (error) return <p style={{ color: 'crimson' }}>{error}</p>;
  if (items.length === 0) return <p>Nothing on your Want to Consume list yet.</p>;

  return (
    <ul>
      {items.map((item) => {
        const isPromoting = promoteDraftId === item.id;

        return (
          <li key={item.id}>
            <strong>{item.title}</strong>
            {item.creator && ` — ${item.creator}`}
            <div>
              <span>{item.media_type}</span>
              {!item.is_public && <> · <span>private</span></>}
            </div>
            {item.note && <p>{item.note}</p>}
            {item.url && (
              <a href={item.url} target="_blank" rel="noreferrer">
                View source
              </a>
            )}

            {isPromoting ? (
              <div>
                <p>How was it?</p>
                <label>
                  Date finished
                  <input
                    type="date"
                    value={promoteDraft.consumed_date}
                    onChange={(e) =>
                      setPromoteDraft((d) => ({ ...d, consumed_date: e.target.value }))
                    }
                  />
                </label>
                <label>
                  Rating (optional)
                  <select
                    value={promoteDraft.rating}
                    onChange={(e) =>
                      setPromoteDraft((d) => ({ ...d, rating: e.target.value }))
                    }
                  >
                    <option value="">—</option>
                    {[1, 2, 3, 4, 5].map((n) => (
                      <option key={n} value={n}>
                        {n}
                      </option>
                    ))}
                  </select>
                </label>
                <textarea
                  placeholder="What did you think? (optional)"
                  value={promoteDraft.note}
                  onChange={(e) =>
                    setPromoteDraft((d) => ({ ...d, note: e.target.value }))
                  }
                  rows={3}
                />
                <button
                  type="button"
                  onClick={() => confirmPromote(item)}
                  disabled={promotingId === item.id}
                >
                  {promotingId === item.id ? 'Adding to ledger…' : 'Add to ledger'}
                </button>
                <button type="button" onClick={cancelPromote}>
                  Cancel
                </button>
              </div>
            ) : (
              <div>
                <button type="button" onClick={() => openPromoteForm(item)}>
                  Mark as consumed
                </button>
                <button
                  type="button"
                  onClick={() => deleteItem(item.id)}
                  disabled={deletingId === item.id}
                >
                  {deletingId === item.id ? 'Removing…' : 'Remove'}
                </button>
              </div>
            )}
          </li>
        );
      })}
    </ul>
  );
}
