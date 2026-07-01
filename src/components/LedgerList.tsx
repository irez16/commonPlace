import { useEffect, useState, useCallback } from 'react';
import { supabase } from '../lib/supabaseClient';
import { MEDIA_TYPES } from '../types';
import type { MediaType, LedgerEntry } from '../types';

interface LedgerListProps {
  userId: string;
  refreshKey: number;
}

interface EditDraft {
  media_type: MediaType;
  title: string;
  creator: string;
  url: string;
  consumed_date: string;
  rating: string;
  note: string;
}

export default function LedgerList({ userId, refreshKey }: LedgerListProps) {
  const [entries, setEntries] = useState<LedgerEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editDraft, setEditDraft] = useState<EditDraft | null>(null);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const fetchEntries = useCallback(async () => {
    setLoading(true);
    setError(null);

    const { data, error: fetchError } = await supabase
      .from('ledger_entries')
      .select('*')
      .eq('user_id', userId)
      .order('consumed_date', { ascending: false })
      .order('created_at', { ascending: false });

    setLoading(false);

    if (fetchError) {
      setError(fetchError.message);
      return;
    }

    setEntries(data as LedgerEntry[]);
  }, [userId]);

  useEffect(() => {
    fetchEntries();
  }, [fetchEntries, refreshKey]);

  const startEdit = (entry: LedgerEntry) => {
    setEditingId(entry.id);
    setEditDraft({
      media_type: entry.media_type,
      title: entry.title,
      creator: entry.creator || '',
      url: entry.url || '',
      consumed_date: entry.consumed_date,
      rating: entry.rating ? String(entry.rating) : '',
      note: entry.note || '',
    });
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditDraft(null);
  };

  const saveEdit = async (id: string) => {
    if (!editDraft) return;

    if (!editDraft.title.trim()) {
      setError('Title is required.');
      return;
    }

    setSavingId(id);
    setError(null);

    const { data, error: updateError } = await supabase
      .from('ledger_entries')
      .update({
        media_type: editDraft.media_type,
        title: editDraft.title.trim(),
        creator: editDraft.creator.trim() || null,
        url: editDraft.url.trim() || null,
        consumed_date: editDraft.consumed_date,
        rating: editDraft.rating ? Number(editDraft.rating) : null,
        note: editDraft.note.trim() || null,
      })
      .eq('id', id)
      .select()
      .single();

    setSavingId(null);

    if (updateError) {
      setError(updateError.message);
      return;
    }

    setEntries((prev) => prev.map((e) => (e.id === id ? (data as LedgerEntry) : e)));
    cancelEdit();
  };

  const deleteEntry = async (id: string) => {
    if (!window.confirm("Delete this entry? This can't be undone.")) return;

    setDeletingId(id);
    setError(null);

    const { error: deleteError } = await supabase
      .from('ledger_entries')
      .delete()
      .eq('id', id);

    setDeletingId(null);

    if (deleteError) {
      setError(deleteError.message);
      return;
    }

    setEntries((prev) => prev.filter((e) => e.id !== id));
  };

  if (loading) return <p>Loading your ledger…</p>;
  if (error) return <p style={{ color: 'crimson' }}>{error}</p>;
  if (entries.length === 0) return <p>Nothing in your ledger yet.</p>;

  return (
    <ul>
      {entries.map((entry) => {
        const isEditing = editingId === entry.id;

        if (isEditing && editDraft) {
          return (
            <li key={entry.id}>
              <select
                value={editDraft.media_type}
                onChange={(e) =>
                  setEditDraft((d) => d && { ...d, media_type: e.target.value as MediaType })
                }
              >
                {MEDIA_TYPES.map((type) => (
                  <option key={type} value={type}>
                    {type}
                  </option>
                ))}
              </select>
              <input
                type="text"
                value={editDraft.title}
                onChange={(e) => setEditDraft((d) => d && { ...d, title: e.target.value })}
                placeholder="Title"
              />
              <input
                type="text"
                value={editDraft.creator}
                onChange={(e) => setEditDraft((d) => d && { ...d, creator: e.target.value })}
                placeholder="Author / director / host"
              />
              <input
                type="url"
                value={editDraft.url}
                onChange={(e) => setEditDraft((d) => d && { ...d, url: e.target.value })}
                placeholder="Link"
              />
              <input
                type="date"
                value={editDraft.consumed_date}
                onChange={(e) =>
                  setEditDraft((d) => d && { ...d, consumed_date: e.target.value })
                }
              />
              <select
                value={editDraft.rating}
                onChange={(e) => setEditDraft((d) => d && { ...d, rating: e.target.value })}
              >
                <option value="">—</option>
                {[1, 2, 3, 4, 5].map((n) => (
                  <option key={n} value={n}>
                    {n}
                  </option>
                ))}
              </select>
              <textarea
                value={editDraft.note}
                onChange={(e) => setEditDraft((d) => d && { ...d, note: e.target.value })}
                placeholder="Note"
                rows={2}
              />
              <button
                type="button"
                onClick={() => saveEdit(entry.id)}
                disabled={savingId === entry.id}
              >
                {savingId === entry.id ? 'Saving…' : 'Save'}
              </button>
              <button type="button" onClick={cancelEdit}>
                Cancel
              </button>
            </li>
          );
        }

        return (
          <li key={entry.id}>
            <strong>{entry.title}</strong>
            {entry.creator && ` — ${entry.creator}`}
            <div>
              <span>{entry.media_type}</span> · <span>{entry.consumed_date}</span>
              {entry.rating && (
                <>
                  {' '}
                  · <span>{entry.rating}/5</span>
                </>
              )}
            </div>
            {entry.note && <p>{entry.note}</p>}
            {entry.url && (
              <a href={entry.url} target="_blank" rel="noreferrer">
                View source
              </a>
            )}
            <div>
              <button type="button" onClick={() => startEdit(entry)}>
                Edit
              </button>
              <button
                type="button"
                onClick={() => deleteEntry(entry.id)}
                disabled={deletingId === entry.id}
              >
                {deletingId === entry.id ? 'Deleting…' : 'Delete'}
              </button>
            </div>
          </li>
        );
      })}
    </ul>
  );
}
