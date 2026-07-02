import { useEffect, useState, useCallback, useMemo } from 'react';
import { supabase } from '../lib/supabaseClient';
import type { WantToConsumeItem } from '../types';

interface WantToConsumeListProps {
  userId: string;
  refreshKey: number;
  onPromoted?: () => void;
  readOnly?: boolean;
  // The currently pinned item's id (lives on the profile, not the item —
  // only one item can ever be pinned at a time). Undefined/null means
  // nothing is pinned.
  pinnedId?: string | null;
  // Called with the new pinned id (or null) whenever the pin changes —
  // including implicitly, when the pinned item is promoted or removed.
  onPinnedChanged?: (id: string | null) => void;
}

interface PromoteDraft {
  consumed_date: string;
  rating: string;
  note: string;
}

// How many items show in the default, non-expanded preview (view mode
// only). Kept as a fixed size — pinned item included, if there is one —
// so the section's height doesn't shift depending on whether something's
// pinned.
const PREVIEW_SIZE = 5;

export default function WantToConsumeList({
  userId,
  refreshKey,
  onPromoted,
  readOnly = false,
  pinnedId = null,
  onPinnedChanged,
}: WantToConsumeListProps) {
  const [items, setItems] = useState<WantToConsumeItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [promotingId, setPromotingId] = useState<string | null>(null);
  const [promoteDraftId, setPromoteDraftId] = useState<string | null>(null);
  const [pinningId, setPinningId] = useState<string | null>(null);
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

  // Pinned item (if present in this filtered set) always sorts first;
  // everything else stays reverse-chronological.
  const orderedItems = useMemo(() => {
    if (!pinnedId) return items;
    const pinned = items.find((i) => i.id === pinnedId);
    if (!pinned) return items;
    return [pinned, ...items.filter((i) => i.id !== pinnedId)];
  }, [items, pinnedId]);

  const visibleItems =
    readOnly && !expanded ? orderedItems.slice(0, PREVIEW_SIZE) : orderedItems;

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
    // The pin lives on the profile row, so deleting the pinned item here
    // clears it server-side (on delete set null) — but our local pinnedId
    // prop won't know that without this. Left empty on purpose: the spec
    // is "stays empty until you deliberately pin something else," not
    // auto-selecting a new favorite.
    if (item.id === pinnedId) onPinnedChanged?.(null);
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
    if (id === pinnedId) onPinnedChanged?.(null);
  };

  const togglePin = async (item: WantToConsumeItem) => {
    const isCurrentlyPinned = pinnedId === item.id;
    const newPinnedId = isCurrentlyPinned ? null : item.id;

    setPinningId(item.id);
    setError(null);

    const { error: updateError } = await supabase
      .from('profiles')
      .update({ pinned_want_to_consume_id: newPinnedId })
      .eq('id', userId);

    setPinningId(null);

    if (updateError) {
      setError(updateError.message);
      return;
    }

    onPinnedChanged?.(newPinnedId);
  };

  if (loading) return <p>Loading {readOnly ? 'list' : 'your list'}…</p>;
  if (error) return <p style={{ color: 'crimson' }}>{error}</p>;
  if (items.length === 0) {
    return <p>Nothing on {readOnly ? 'the' : 'your'} Want to Consume list yet.</p>;
  }

  return (
    <>
      <ul>
        {visibleItems.map((item) => {
          const isPromoting = promoteDraftId === item.id;
          const isPinned = pinnedId === item.id;

          return (
            <li key={item.id}>
              {isPinned && <span aria-label="Pinned">📌 </span>}
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

              {readOnly ? null : isPromoting ? (
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
                  <button
                    type="button"
                    onClick={() => togglePin(item)}
                    disabled={pinningId === item.id}
                    aria-pressed={isPinned}
                  >
                    {pinningId === item.id ? '…' : isPinned ? 'Unpin' : 'Pin'}
                  </button>
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
      {readOnly && !expanded && orderedItems.length > PREVIEW_SIZE && (
        <button type="button" onClick={() => setExpanded(true)}>
          See all
        </button>
      )}
    </>
  );
}
