import { useEffect, useState, useCallback, type CSSProperties } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient';
import { resolveJournalFont } from '../lib/journalFonts';
import { resolveLedgerAccent } from '../lib/ledgerAccent';
import type { Passage, LedgerEntry, Profile } from '../types';
import './PassageList.css';

interface PassageListProps {
  userId: string;
  // Needed to build the /@username/ledger/:entryId source link on each
  // clip — PassageList doesn't fetch the profile itself.
  username: string;
  refreshKey: number;
  readOnly?: boolean;
  // The app-wide accent picked in Settings — this is the Journal's
  // default color now, so it stays visually consistent with the
  // Ledger/profile header rather than tracking its own separate value.
  ledgerAccent?: Profile['ledger_accent'] | null;
  // Per-user Journal customization (Marginalia). journalCoverColor, if
  // set, overrides ledgerAccent for the Journal specifically — an
  // explicit "make my Journal a different color than my Ledger" choice.
  // journalFont is unrelated to accent and always applies independently.
  journalCoverColor?: string | null;
  journalFont?: string | null;
}

interface EntryContext {
  title: string;
  creator: string | null;
}

const CLIP_TYPE_LABELS: Record<Passage['clip_type'], string> = {
  text: 'Text',
  image: 'Image',
  video: 'Video',
  audio: 'Audio',
};

export default function PassageList({
  userId,
  username,
  refreshKey,
  readOnly = false,
  ledgerAccent,
  journalCoverColor,
  journalFont,
}: PassageListProps) {
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

  if (loading) return <p className="passage-list-status">Loading journal…</p>;
  if (error) return <p className="passage-list-status" style={{ color: 'crimson' }}>{error}</p>;
  if (passages.length === 0) {
    return (
      <p className="passage-list-status">
        {readOnly ? 'No journal entries yet.' : "You haven't clipped anything yet."}
      </p>
    );
  }

  // CSS custom properties, not literal color/font values — lets each
  // card's annotation/border resolve via
  // var(--passage-accent, var(--marginalia)) in the stylesheet.
  // Default is the same accent picked in Settings for the Ledger
  // (ledgerAccent), so the Journal matches the rest of the app by
  // default. journalCoverColor, if a profile has explicitly set one,
  // overrides that default — an intentional "different color for my
  // Journal specifically" choice, not the fallback.
  const cardStyle: CSSProperties & Record<string, string> = {
    '--passage-accent': journalCoverColor || resolveLedgerAccent(ledgerAccent),
  };
  if (journalFont) cardStyle['--passage-font'] = resolveJournalFont(journalFont);

  return (
    <ul className="passage-list">
      {passages.map((passage) => {
        const entry = entryById[passage.ledger_entry_id];

        return (
          <li key={passage.id} className="passage-card" style={cardStyle}>
            <Link
              className="passage-card-link-wrapper"
              to={`/@${username}/journal/${passage.id}`}
            >
              <div className="passage-card-type">{CLIP_TYPE_LABELS[passage.clip_type]}</div>

              {passage.clip_type === 'text' && (
                <p className="passage-card-quote">{passage.clipped_text}</p>
              )}
              {passage.clip_type === 'image' && passage.media_path && (
                <div className="passage-card-media">
                  <img src={mediaUrl(passage.media_path)} alt="" />
                </div>
              )}
            </Link>

            {/* video/audio have their own native interactive controls,
                which shouldn't nest inside an <a> (the Link above) —
                invalid HTML, and browsers handle clicks on those
                controls inconsistently when wrapped that way. */}
            {passage.clip_type === 'video' && passage.media_path && (
              <div className="passage-card-media">
                <video controls src={mediaUrl(passage.media_path)} />
              </div>
            )}
            {passage.clip_type === 'audio' && passage.media_path && (
              <div className="passage-card-media">
                <audio controls src={mediaUrl(passage.media_path)} />
              </div>
            )}

            <Link
              className="passage-card-link-wrapper"
              to={`/@${username}/journal/${passage.id}`}
            >
              {passage.annotation && (
                <p className="passage-card-annotation">{passage.annotation}</p>
              )}
            </Link>

            <div className="passage-card-source">
              {entry && (
                <span>
                  From{' '}
                  <Link
                    to={`/@${username}/ledger/${passage.ledger_entry_id}`}
                    onClick={(e) => e.stopPropagation()}
                  >
                    {entry.title}
                    {entry.creator ? ` by ${entry.creator}` : ''}
                  </Link>
                </span>
              )}
              {passage.page_or_timestamp && <span>· {passage.page_or_timestamp}</span>}
            </div>

            {!readOnly && (
              <button
                type="button"
                className="passage-card-delete"
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
