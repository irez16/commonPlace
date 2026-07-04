import { useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import { supabase } from '../lib/supabaseClient';
import { CLIP_TYPES } from '../types';
import type { ClipType, Passage } from '../types';

interface AddPassageProps {
  userId: string;
  onAdded?: (passage: Passage) => void;
}

interface LedgerOption {
  id: string;
  title: string;
  creator: string | null;
}

const ACCEPT_BY_TYPE: Record<ClipType, string | undefined> = {
  text: undefined,
  image: 'image/*',
  video: 'video/*',
  audio: 'audio/*',
};

export default function AddPassage({ userId, onAdded }: AddPassageProps) {
  const [ledgerOptions, setLedgerOptions] = useState<LedgerOption[]>([]);
  const [optionsLoading, setOptionsLoading] = useState(true);
  const [ledgerEntryId, setLedgerEntryId] = useState('');
  const [clipType, setClipType] = useState<ClipType>('text');
  const [clippedText, setClippedText] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [annotation, setAnnotation] = useState('');
  const [pageOrTimestamp, setPageOrTimestamp] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Clips are always linked to a ledger entry, so we need something to
  // link to. Fetches the user's own entries for the picker — title +
  // creator, newest first, matching how they'd expect to find something
  // they logged recently.
  useEffect(() => {
    let cancelled = false;

    (async () => {
      setOptionsLoading(true);
      const { data, error: fetchError } = await supabase
        .from('ledger_entries')
        .select('id, title, creator')
        .eq('user_id', userId)
        .order('consumed_date', { ascending: false });

      if (cancelled) return;
      setOptionsLoading(false);

      if (fetchError) {
        setError(fetchError.message);
        return;
      }

      const options = (data ?? []) as LedgerOption[];
      setLedgerOptions(options);
      if (options.length > 0) setLedgerEntryId((prev) => prev || options[0].id);
    })();

    return () => {
      cancelled = true;
    };
  }, [userId]);

  const resetForm = () => {
    setClippedText('');
    setFile(null);
    setAnnotation('');
    setPageOrTimestamp('');
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!ledgerEntryId) {
      setError('Pick which ledger entry this clip is from.');
      return;
    }
    if (clipType === 'text' && !clippedText.trim()) {
      setError('Add the text you want to clip.');
      return;
    }
    if (clipType !== 'text' && !file) {
      setError(`Choose a ${clipType} file to upload.`);
      return;
    }

    setSubmitting(true);

    let mediaPath: string | null = null;

    if (clipType !== 'text' && file) {
      // Path shape "{user_id}/{...}" matches the storage RLS policies,
      // which check the first folder segment against auth.uid().
      const ext = file.name.includes('.') ? file.name.split('.').pop() : '';
      const path = `${userId}/${crypto.randomUUID()}${ext ? `.${ext}` : ''}`;

      const { error: uploadError } = await supabase.storage
        .from('passage-media')
        .upload(path, file);

      if (uploadError) {
        setSubmitting(false);
        setError(uploadError.message);
        return;
      }

      mediaPath = path;
    }

    const { data, error: insertError } = await supabase
      .from('passages')
      .insert({
        user_id: userId,
        ledger_entry_id: ledgerEntryId,
        clip_type: clipType,
        clipped_text: clipType === 'text' ? clippedText.trim() : null,
        media_path: mediaPath,
        annotation: annotation.trim() || null,
        page_or_timestamp: pageOrTimestamp.trim() || null,
      })
      .select()
      .single();

    setSubmitting(false);

    if (insertError) {
      setError(insertError.message);
      return;
    }

    resetForm();
    onAdded?.(data as Passage);
  };

  if (optionsLoading) return <p>Loading your ledger…</p>;

  if (ledgerOptions.length === 0) {
    return <p>Add something to your Ledger first — every clip needs to be linked to an entry.</p>;
  }

  return (
    <form onSubmit={handleSubmit}>
      <label>
        From
        <select value={ledgerEntryId} onChange={(e) => setLedgerEntryId(e.target.value)}>
          {ledgerOptions.map((opt) => (
            <option key={opt.id} value={opt.id}>
              {opt.title}
              {opt.creator ? ` — ${opt.creator}` : ''}
            </option>
          ))}
        </select>
      </label>

      <div>
        {CLIP_TYPES.map((type) => (
          <label key={type}>
            <input
              type="radio"
              name="clip_type"
              value={type}
              checked={clipType === type}
              onChange={() => {
                setClipType(type);
                setFile(null);
              }}
            />
            {type}
          </label>
        ))}
      </div>

      {clipType === 'text' ? (
        <textarea
          placeholder="Paste or type the passage…"
          value={clippedText}
          onChange={(e) => setClippedText(e.target.value)}
          rows={4}
        />
      ) : (
        <input
          type="file"
          accept={ACCEPT_BY_TYPE[clipType]}
          onChange={(e) => setFile(e.target.files?.[0] ?? null)}
        />
      )}

      <input
        type="text"
        placeholder="Page or timestamp (optional)"
        value={pageOrTimestamp}
        onChange={(e) => setPageOrTimestamp(e.target.value)}
      />

      <textarea
        placeholder="Your thoughts on this (optional)"
        value={annotation}
        onChange={(e) => setAnnotation(e.target.value)}
        rows={2}
      />

      <button type="submit" disabled={submitting}>
        {submitting ? 'Adding…' : 'Add to journal'}
      </button>

      {error && <p style={{ color: 'crimson' }}>{error}</p>}
    </form>
  );
}
