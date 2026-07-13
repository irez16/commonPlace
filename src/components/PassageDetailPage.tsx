import { useEffect, useState, useCallback, type CSSProperties } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient';
import { usePublicProfile } from '../hooks/usePublicProfile';
import { useDocumentTitle } from '../hooks/useDocumentTitle';
import { resolveJournalFont } from '../lib/journalFonts';
import { resolveLedgerAccent } from '../lib/ledgerAccent';
import type { Passage } from '../types';
import './AppForm.css';
import './PassageList.css';
import './PassageDetailPage.css';

const CLIP_TYPE_LABELS: Record<Passage['clip_type'], string> = {
  text: 'Text',
  image: 'Image',
  video: 'Video',
  audio: 'Audio',
};

interface EntryContext {
  title: string;
  creator: string | null;
}

// Full-detail view for a single Journal clip, reached by tapping a card
// in PassageList. Untruncated text/media, plus Previous/Next between
// this person's clips in the same chronological order PassageList
// shows them in. This is tap-to-navigate rather than a true swipe
// gesture — smooth swipe navigation is a meaningfully bigger interaction
// to build well (drag tracking, velocity, snap-back), and tap buttons
// get most of the value for a lot less risk of feeling janky.
export default function PassageDetailPage() {
  const { handle, passageId } = useParams<{ handle: string; passageId: string }>();
  const navigate = useNavigate();
  const username = handle?.startsWith('@') ? handle.slice(1) : undefined;
  const { profile } = usePublicProfile(username);

  const [passage, setPassage] = useState<Passage | null>(null);
  const [entry, setEntry] = useState<EntryContext | null>(null);
  const [siblingIds, setSiblingIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [error, setError] = useState<string | null>(null);
  useDocumentTitle(entry ? `Clip from ${entry.title}` : 'Journal clip');

  const fetchPassage = useCallback(async () => {
    if (!passageId || !profile) return;

    setLoading(true);
    setError(null);
    setNotFound(false);

    const [{ data: passageRow, error: passageError }, { data: siblingRows, error: siblingError }] =
      await Promise.all([
        supabase.from('passages').select('*').eq('id', passageId).maybeSingle(),
        // Same ordering PassageList uses, so Prev/Next steps through
        // clips in the same order they appear on the Journal page.
        supabase
          .from('passages')
          .select('id')
          .eq('user_id', profile.id)
          .order('created_at', { ascending: false }),
      ]);

    if (passageError || siblingError) {
      setLoading(false);
      setError(passageError?.message ?? siblingError?.message ?? 'Failed to load clip.');
      return;
    }

    if (!passageRow) {
      setLoading(false);
      setNotFound(true);
      return;
    }

    setSiblingIds((siblingRows ?? []).map((r) => r.id as string));
    setPassage(passageRow as Passage);

    const { data: entryRow } = await supabase
      .from('ledger_entries')
      .select('title, creator')
      .eq('id', (passageRow as Passage).ledger_entry_id)
      .maybeSingle();

    setEntry(entryRow ? { title: entryRow.title, creator: entryRow.creator } : null);
    setLoading(false);
  }, [passageId, profile]);

  useEffect(() => {
    fetchPassage();
  }, [fetchPassage]);

  const mediaUrl = (path: string) =>
    supabase.storage.from('passage-media').getPublicUrl(path).data.publicUrl;

  if (loading) return <p className="passage-list-status">Loading…</p>;
  if (error) return <p className="passage-list-status" style={{ color: 'crimson' }}>{error}</p>;
  if (notFound || !passage || !profile) return <p className="passage-list-status">Clip not found.</p>;

  const currentIndex = siblingIds.indexOf(passage.id);
  const prevId = currentIndex >= 0 && currentIndex < siblingIds.length - 1 ? siblingIds[currentIndex + 1] : null;
  const nextId = currentIndex > 0 ? siblingIds[currentIndex - 1] : null;

  const cardStyle: CSSProperties & Record<string, string> = {
    '--passage-accent': profile.journal_cover_color || resolveLedgerAccent(profile.ledger_accent),
  };
  if (profile.journal_font) cardStyle['--passage-font'] = resolveJournalFont(profile.journal_font);

  return (
    <div className="passage-detail-page">
      <Link className="passage-detail-breadcrumb" to={`/@${username}/journal`}>
        ← Journal
      </Link>

      <div className="passage-card" style={cardStyle}>
        <div className="passage-card-type">{CLIP_TYPE_LABELS[passage.clip_type]}</div>

        {passage.clip_type === 'text' && (
          <p className="passage-card-quote">{passage.clipped_text}</p>
        )}
        {passage.clip_type === 'image' && passage.media_path && (
          <div className="passage-card-media">
            <img src={mediaUrl(passage.media_path)} alt="" />
          </div>
        )}
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

        {passage.annotation && <p className="passage-card-annotation">{passage.annotation}</p>}

        <div className="passage-card-source">
          {entry && (
            <span>
              From{' '}
              <Link to={`/@${username}/ledger/${passage.ledger_entry_id}`}>
                {entry.title}
                {entry.creator ? ` — ${entry.creator}` : ''}
              </Link>
            </span>
          )}
          {passage.page_or_timestamp && <span>· {passage.page_or_timestamp}</span>}
        </div>
      </div>

      <div className="passage-detail-nav">
        <button
          type="button"
          className="app-form-secondary-button"
          disabled={!prevId}
          onClick={() => prevId && navigate(`/@${username}/journal/${prevId}`)}
        >
          ← Newer
        </button>
        <button
          type="button"
          className="app-form-secondary-button"
          disabled={!nextId}
          onClick={() => nextId && navigate(`/@${username}/journal/${nextId}`)}
        >
          Older →
        </button>
      </div>
    </div>
  );
}
