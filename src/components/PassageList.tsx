import { useEffect, useState, useCallback } from 'react';
import { supabase } from '../lib/supabaseClient';
import type { Passage, LedgerEntry } from '../types';

interface PassageListProps {
  userId: string;
  refreshKey: number;
  readOnly?: boolean;
}

interface EntryContext {
  title: string;
  creator: string | null;
}

export default function PassageList({ userId, refreshKey, readOnly = false }: PassageListProps) {
  const [passages, setPassages] = useState<Passage[]>([]);
  const [entryById, setEntryById] = useState<Record<string, EntryContext>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const fetchPassages = useCallback(async () => {
    setLoading(true);
    setError(null);

    const { data, error: fetchError } = await supabase
      .from('passages')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (fetchError) {
      setLoading(false);
      setError(fetchError.message);
      return;
    }

    const fetched = (data ?? []) as Passage[];
    setPassages(fetched);

    // Two-step fetch (same pattern as useFeed/useFollowList) to resolve
    // each clip's linked ledger entry for display context.
    const entryIds = Array.from(new Set(fetched.map((p) => p.ledger_entry_id)));
    if (entryIds.length === 0) {
      setLoading(false);
      setEntryById({});
      return;
    }

    const { data: entryRows, error: entryError } = await supabase
      .from('ledger_entries')
      .select('id, title, creator')
      .in('id', entryIds);

    setLoading(false);

    if (entryError) {
      setError(entryError.message);
      return;
    }

    const map: Record<string, EntryContext> = {};
    for (const row of (entryRows ?? []) as Pick<LedgerEntry, 'id' | 'title' | 'creator'>[]) {
      map[row.id] = { title: row.title, creator: row.creator };
    }
    setEntryById(map);
  }, [userId]);

  useEffect(() => {
    fetchPassages();
  }, [fetchPassages, refreshKey]);

  const mediaUrl = (path: string) =>
    supabase.storage.from('passage-media').getPublicUrl(path).data.publicUrl;

  const deletePassage = async (id: string, mediaPath: string | null) => {
    if (!window.confirm("Delete this clip? This can't be undone.")) return;

    setDeletingId(id);
    setError(null);

    const { error: deleteError } = await supabase.from('passages').delete().eq('id', id);

    if (deleteError) {
      setDeletingId(null);
      setError(deleteError.message);
      return;
    }

    // Best-effort cleanup — if this fails the row is already gone, so we
    // don't block on it or surface it as a hard error.
    if (mediaPath) {
      await supabase.storage.from('passage-media').remove([mediaPath]);
    }

    setDeletingId(null);
    setPassages((prev) => prev.filter((p) => p.id !== id));
  };

  if (loading) return <p>Loading journal…</p>;
  if (error) return <p style={{ color: 'crimson' }}>{error}</p>;
  if (passages.length === 0) {
    return <p>{readOnly ? 'No journal entries yet.' : "You haven't clipped anything yet."}</p>;
  }

  return (
    <ul>
      {passages.map((passage) => {
        const entry = entryById[passage.ledger_entry_id];

        return (
          <li key={passage.id}>
            {passage.clip_type === 'text' && <blockquote>{passage.clipped_text}</blockquote>}
            {passage.clip_type === 'image' && passage.media_path && (
              <img src={mediaUrl(passage.media_path)} alt="" style={{ maxWidth: '100%' }} />
            )}
            {passage.clip_type === 'video' && passage.media_path && (
              <video controls src={mediaUrl(passage.media_path)} style={{ maxWidth: '100%' }} />
            )}
            {passage.clip_type === 'audio' && passage.media_path && (
              <audio controls src={mediaUrl(passage.media_path)} />
            )}

            {passage.annotation && <p>{passage.annotation}</p>}

            <div>
              {entry && (
                <span>
                  From: {entry.title}
                  {entry.creator ? ` — ${entry.creator}` : ''}
                </span>
              )}
              {passage.page_or_timestamp && <span> · {passage.page_or_timestamp}</span>}
            </div>

            {!readOnly && (
              <button
                type="button"
                onClick={() => deletePassage(passage.id, passage.media_path)}
                disabled={deletingId === passage.id}
              >
                {deletingId === passage.id ? 'Deleting…' : 'Delete'}
              </button>
            )}
          </li>
        );
      })}
    </ul>
  );
}
