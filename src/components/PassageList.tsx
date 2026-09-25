import { useEffect, useState, useCallback, type CSSProperties } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient';
import { resolveJournalFont } from '../lib/journalFonts';
import { resolveLedgerAccent } from '../lib/ledgerAccent';
import { useRefetchOnForeground } from '../hooks/useRefetchOnForeground';
import type { Passage, LedgerEntry, Profile } from '../types';
import ClampedText from './ClampedText';
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
  // Owner only: turns on the Journal's edit mode from the empty state.
  // Visitors don't get this, so they keep the plain empty message.
  onStartClipping?: () => void;
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
  onStartClipping,
}: PassageListProps) {
  const [passages, setPassages] = useState<Passage[]>([]);
  const [entryById, setEntryById] = useState<Record<string, EntryContext>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // background: a refresh when the app returns to the foreground. The
  // current clips stay on screen (no loading state) until the new ones
  // arrive, and a failure keeps them rather than showing an error.
  const fetchPassages = useCallback(async ({ background = false } = {}) => {
    if (!background) {
      setLoading(true);
      setError(null);
    }

    const { data, error: fetchError } = await supabase
      .from('passages')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (fetchError) {
      if (!background) {
        setLoading(false);
        setError(fetchError.message);
      }
      return;
    }

    const fetched = (data ?? []) as Passage[];

    // Two-step fetch (same pattern as useFeed/useFollowList) to resolve
    // each clip's linked ledger entry for display context.
    const entryIds = Array.from(new Set(fetched.map((p) => p.ledger_entry_id)));
    if (entryIds.length === 0) {
      setPassages(fetched);
      setLoading(false);
      setError(null);
      setEntryById({});
      return;
    }

    // A foreground refresh swaps clips and their sources in together, so
    // a new clip never shows without its "From" line.
    if (!background) setPassages(fetched);

    const { data: entryRows, error: entryError } = await supabase
      .from('ledger_entries')
      .select('id, title, creator')
      .in('id', entryIds);

    if (entryError) {
      if (!background) {
        setLoading(false);
        setError(entryError.message);
      }
      return;
    }

    const map: Record<string, EntryContext> = {};
    for (const row of (entryRows ?? []) as Pick<LedgerEntry, 'id' | 'title' | 'creator'>[]) {
      map[row.id] = { title: row.title, creator: row.creator };
    }
    if (background) {
      setPassages(fetched);
      setError(null);
    }
    setLoading(false);
    setEntryById(map);
  }, [userId]);

  useEffect(() => {
    fetchPassages();
  }, [fetchPassages, refreshKey]);

  useRefetchOnForeground(() => fetchPassages({ background: true }));

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
  if (error) return <p className="passage-list-status text-error">{error}</p>;
  if (passages.length === 0 && onStartClipping && readOnly) {
    return (
      <div className="passage-list-empty">
        <p className="passage-list-status">
          Clips are passages you save from something in your Ledger: a line from a book, a
          moment in a film. Each one hangs off a Ledger entry.
        </p>
        <button type="button" className="passage-list-empty-action hit-area" onClick={onStartClipping}>
          Clip your first passage
        </button>
      </div>
    );
  }
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

              {/* Long clips are cut to a few lines here; the clip's own
                  page (this link) shows the whole text. */}
              {passage.clip_type === 'text' && (
                <ClampedText
                  className="passage-card-quote"
                  text={passage.clipped_text ?? ''}
                  more={<span className="clamped-text-more">Read more</span>}
                />
              )}
              {passage.clip_type === 'image' && passage.media_path && (
                <div className="passage-card-media">
                  <img
                    src={mediaUrl(passage.media_path)}
                    alt={
                      passage.annotation ||
                      `Image clip from ${entry?.title ?? 'a Journal entry'}`
                    }
                  />
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
                className="passage-card-delete hit-area"
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
