import { useEffect, useState, useCallback } from 'react';
import { supabase } from '../lib/supabaseClient';
import type { WantToConsumeItem } from '../types';
import './WantToConsumeList.css';

interface WantToConsumeListProps {
  userId: string;
  refreshKey: number;
  onPromoted?: () => void;
  readOnly?: boolean;
}

interface PromoteDraft {
  consumed_date: string;
  rating: string;
  note: string;
}

// How many items show in the default, non-expanded preview (view mode
// only) — the most recent additions, plain reverse-chronological.
const PREVIEW_SIZE = 5;

export default function WantToConsumeList({
  userId,
  refreshKey,
  onPromoted,
  readOnly = false,
}: WantToConsumeListProps) {
  const [items, setItems] = useState<WantToConsumeItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [promotingId, setPromotingId] = useState<string | null>(null);
  const [promoteDraftId, setPromoteDraftId] = useState<string | null>(null);
  const [expanded, setExpanded] = useState(false);
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

    const fetched = data as WantToConsumeItem[];
    // Public profile view: only ever show public items, even if the viewer
    // happens to be the owner (RLS would otherwise let their own private
    // items through too).
    setItems(readOnly ? fetched.filter((item) => item.is_public) : fetched);
  }, [userId, readOnly]);

  useEffect(() => {
    fetchItems();
  }, [fetchItems, refreshKey]);

  // Reset the expanded ("see all") state whenever we switch in or out of
  // edit mode, so leaving edit mode doesn't leave a stale expanded list.
  useEffect(() => {
    setExpanded(false);
  }, [readOnly]);

  const visibleItems = readOnly && !expanded ? items.slice(0, PREVIEW_SIZE) : items;

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

  if (loading) return <p className="wtc-empty">Loading {readOnly ? 'list' : 'your list'}…</p>;
  if (error) return <p style={{ color: 'crimson' }}>{error}</p>;
  if (items.length === 0) {
    return <p className="wtc-empty">Nothing on {readOnly ? 'the' : 'your'} Want to Consume list yet.</p>;
  }

  return (
    <>
      <ul className="wtc-list">
        {visibleItems.map((item) => {
          const isPromoting = promoteDraftId === item.id;

          if (isPromoting) {
            return (
              <li key={item.id} className="wtc-promote-form">
                <p className="wtc-row-title">How was {item.title}?</p>
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
                    <option value="">No rating</option>
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
                <div className="wtc-row-actions">
                  <button
                    type="button"
                    onClick={() => confirmPromote(item)}
                    disabled={promotingId === item.id}
                  >
                    {promotingId === item.id ? 'Adding…' : 'Add to ledger'}
                  </button>
                  <button type="button" onClick={cancelPromote}>
                    Cancel
                  </button>
                </div>
              </li>
            );
          }

          return (
            <li key={item.id} className="wtc-row">
              <div className="wtc-row-main">
                <div className="wtc-row-title">
                  {item.title}
                  {item.creator && ` by ${item.creator}`}
                </div>
                <div className="wtc-row-meta">
                  {item.media_type}
                  {!item.is_public && ' · private'}
                </div>
              </div>

              {readOnly ? null : (
                <div className="wtc-row-actions">
                  <button type="button" onClick={() => openPromoteForm(item)}>
                    Consumed
                  </button>
                  <button
                    type="button"
                    onClick={() => deleteItem(item.id)}
                    disabled={deletingId === item.id}
                  >
                    {deletingId === item.id ? '…' : 'Remove'}
                  </button>
                </div>
              )}
            </li>
          );
        })}
      </ul>
      {readOnly && !expanded && items.length > PREVIEW_SIZE && (
        <button type="button" className="wtc-see-all" onClick={() => setExpanded(true)}>
          See all ({items.length})
        </button>
      )}
    </>
  );
}
