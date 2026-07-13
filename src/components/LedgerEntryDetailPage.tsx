import { useEffect, useState, useCallback, type CSSProperties } from 'react';
import { useParams, Link } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient';
import { usePublicProfile } from '../hooks/usePublicProfile';
import { useDocumentTitle } from '../hooks/useDocumentTitle';
import { resolveLedgerAccent } from '../lib/ledgerAccent';
import type { LedgerEntry } from '../types';
import { MEDIA_TYPE_LABELS } from '../types';
import './LedgerEntryDetailPage.css';

function formatConsumedDate(dateStr: string): string {
  const date = new Date(`${dateStr}T12:00:00`);
  return new Intl.DateTimeFormat('en-US', { month: 'long', year: 'numeric', day: 'numeric' }).format(date);
}

// Read-only detail view for a single Ledger entry — reached by tapping
// a card in LedgerList. Editing/deleting still only happens from the
// Ledger's own edit mode on the profile, not from here, to avoid
// duplicating that form logic in a second place.
export default function LedgerEntryDetailPage() {
  const { handle, entryId } = useParams<{ handle: string; entryId: string }>();
  const username = handle?.startsWith('@') ? handle.slice(1) : undefined;
  const { profile } = usePublicProfile(username);

  const [entry, setEntry] = useState<LedgerEntry | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [error, setError] = useState<string | null>(null);
  useDocumentTitle(entry?.title);

  const fetchEntry = useCallback(async () => {
    if (!entryId) return;

    setLoading(true);
    setError(null);
    setNotFound(false);

    const { data, error: fetchError } = await supabase
      .from('ledger_entries')
      .select('*')
      .eq('id', entryId)
      .maybeSingle();

    setLoading(false);

    if (fetchError) {
      setError(fetchError.message);
      return;
    }

    if (!data) {
      setNotFound(true);
      return;
    }

    setEntry(data as LedgerEntry);
  }, [entryId]);

  useEffect(() => {
    fetchEntry();
  }, [fetchEntry]);

  if (loading) return <p className="ledger-detail-status">Loading…</p>;
  if (error) return <p className="ledger-detail-status" style={{ color: 'crimson' }}>{error}</p>;
  if (notFound || !entry) return <p className="ledger-detail-status">Entry not found.</p>;

  const pageStyle: CSSProperties & Record<string, string> = {
    '--ledger-accent': resolveLedgerAccent(profile?.ledger_accent),
  };

  return (
    <div className="ledger-detail-page" style={pageStyle}>
      <Link className="ledger-detail-back" to={username ? `/@${username}` : '/'}>
        ← {profile ? profile.name : 'Back to profile'}
      </Link>

      <div className="ledger-detail-meta">
        <span>{MEDIA_TYPE_LABELS[entry.media_type]}</span>
        <span>·</span>
        <span>{formatConsumedDate(entry.consumed_date)}</span>
        {entry.rating && (
          <>
            <span>·</span>
            <span>{entry.rating}/5</span>
          </>
        )}
      </div>

      <h1 className="ledger-detail-title">{entry.title}</h1>
      {entry.creator && <div className="ledger-detail-creator">{entry.creator}</div>}

      {entry.note && <p className="ledger-detail-note">{entry.note}</p>}

      {entry.url && (
        <a className="ledger-detail-link" href={entry.url} target="_blank" rel="noreferrer">
          View source
        </a>
      )}
    </div>
  );
}
