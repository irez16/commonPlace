import { useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import { supabase } from '../lib/supabaseClient';
import { notifyInCommonMatches } from '../lib/inCommonMatching';
import { CLIP_TYPES, MEDIA_TYPES } from '../types';
import type { ClipType, LedgerEntry, MediaType, Passage } from '../types';
import MediaSearchField, { supportsSearch } from './MediaSearchField';
import LinkAutofillField from './LinkAutofillField';
import type { MediaSearchResult } from '../lib/mediaSearch';
import './AppForm.css';

const LINK_AUTOFILL_TYPES: MediaType[] = ['youtube', 'substack', 'essay'];

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

const NEW_SOURCE_VALUE = '__new__';

const today = () => new Date().toISOString().slice(0, 10);

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

  // Quick-add-a-source state — lets you add something to your Ledger
  // without leaving the Journal. Deliberately minimal (type/title/creator)
  // with an option to expand into the full set of fields, rather than
  // always showing everything up front.
  const [addingNewSource, setAddingNewSource] = useState(false);
  const [newSourceExpanded, setNewSourceExpanded] = useState(false);
  const [newMediaType, setNewMediaType] = useState<MediaType>('book');
  const [newTitle, setNewTitle] = useState('');
  const [newCreator, setNewCreator] = useState('');
  const [newUrl, setNewUrl] = useState('');
  const [newConsumedDate, setNewConsumedDate] = useState(today());
  const [newRating, setNewRating] = useState('');
  const [newNote, setNewNote] = useState('');
  const [creatingSource, setCreatingSource] = useState(false);

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
      if (options.length > 0) {
        setLedgerEntryId((prev) => prev || options[0].id);
      } else {
        // Nothing in the Ledger yet — go straight to quick-add rather
        // than dead-ending with "add something to your Ledger first".
        setAddingNewSource(true);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [userId]);

  const handleNewSourceAutofill = (result: MediaSearchResult) => {
    setNewTitle(result.title);
    setNewCreator(result.creator ?? '');
  };

  const handleNewSourceLinkFetched = (metadata: { title: string | null; creator: string | null }) => {
    if (metadata.title) setNewTitle(metadata.title);
    if (metadata.creator) setNewCreator(metadata.creator);
  };

  const resetNewSourceForm = () => {
    setNewMediaType('book');
    setNewTitle('');
    setNewCreator('');
    setNewUrl('');
    setNewConsumedDate(today());
    setNewRating('');
    setNewNote('');
    setNewSourceExpanded(false);
  };

  const resetForm = () => {
    setClippedText('');
    setFile(null);
    setAnnotation('');
    setPageOrTimestamp('');
  };

  const createNewSource = async () => {
    setError(null);

    if (!newTitle.trim()) {
      setError('Title is required.');
      return;
    }

    setCreatingSource(true);

    const { data, error: insertError } = await supabase
      .from('ledger_entries')
      .insert({
        user_id: userId,
        media_type: newMediaType,
        title: newTitle.trim(),
        creator: newCreator.trim() || null,
        url: newUrl.trim() || null,
        consumed_date: newConsumedDate,
        rating: newRating ? Number(newRating) : null,
        note: newNote.trim() || null,
      })
      .select()
      .single();

    setCreatingSource(false);

    if (insertError) {
      setError(insertError.message);
      return;
    }

    const created = data as LedgerEntry;
    setLedgerOptions((prev) => [
      { id: created.id, title: created.title, creator: created.creator },
      ...prev,
    ]);
    setLedgerEntryId(created.id);
    setAddingNewSource(false);
    resetNewSourceForm();
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);

    if (addingNewSource) {
      setError('Finish adding the new source first, or cancel it.');
      return;
    }
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
    const newPassage = data as Passage;
    onAdded?.(newPassage);
    // Fire-and-forget: shouldn't block the form or surface as an error to
    // the person adding the clip, since the clip itself already saved.
    notifyInCommonMatches(newPassage).catch(() => {});
  };

  if (optionsLoading) return <p className="app-form-loading">Loading your ledger…</p>;

  return (
    <form className="app-form" onSubmit={handleSubmit}>
      <label>
        From
        <select
          value={addingNewSource ? NEW_SOURCE_VALUE : ledgerEntryId}
          onChange={(e) => {
            if (e.target.value === NEW_SOURCE_VALUE) {
              setAddingNewSource(true);
            } else {
              setAddingNewSource(false);
              setLedgerEntryId(e.target.value);
            }
          }}
        >
          {ledgerOptions.map((opt) => (
            <option key={opt.id} value={opt.id}>
              {opt.title}
              {opt.creator ? ` — ${opt.creator}` : ''}
            </option>
          ))}
          <option value={NEW_SOURCE_VALUE}>+ Add new source</option>
        </select>
      </label>

      {addingNewSource && (
        <div className="app-form-subpanel">
          <label>
            Type
            <select
              value={newMediaType}
              onChange={(e) => setNewMediaType(e.target.value as MediaType)}
            >
              {MEDIA_TYPES.map((type) => (
                <option key={type} value={type}>
                  {type}
                </option>
              ))}
            </select>
          </label>

          {LINK_AUTOFILL_TYPES.includes(newMediaType) && (
            <LinkAutofillField
              url={newUrl}
              onUrlChange={setNewUrl}
              onFetched={handleNewSourceLinkFetched}
            />
          )}

          {supportsSearch(newMediaType) ? (
            <MediaSearchField
              mediaType={newMediaType}
              value={newTitle}
              onChange={setNewTitle}
              onSelect={handleNewSourceAutofill}
              placeholder="Title — start typing to search"
            />
          ) : (
            <input
              type="text"
              placeholder="Title"
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
            />
          )}

          <input
            type="text"
            placeholder="Author / director / host (optional)"
            value={newCreator}
            onChange={(e) => setNewCreator(e.target.value)}
          />

          {newSourceExpanded ? (
            <>
              {!LINK_AUTOFILL_TYPES.includes(newMediaType) && (
                <input
                  type="url"
                  placeholder="Link (optional)"
                  value={newUrl}
                  onChange={(e) => setNewUrl(e.target.value)}
                />
              )}
              <label>
                Date consumed
                <input
                  type="date"
                  value={newConsumedDate}
                  onChange={(e) => setNewConsumedDate(e.target.value)}
                />
              </label>
              <label>
                Rating (optional)
                <select value={newRating} onChange={(e) => setNewRating(e.target.value)}>
                  <option value="">—</option>
                  {[1, 2, 3, 4, 5].map((n) => (
                    <option key={n} value={n}>
                      {n}
                    </option>
                  ))}
                </select>
              </label>
              <textarea
                placeholder="Note (optional)"
                value={newNote}
                onChange={(e) => setNewNote(e.target.value)}
                rows={3}
              />
            </>
          ) : (
            <button
              type="button"
              className="app-form-secondary-button"
              onClick={() => setNewSourceExpanded(true)}
            >
              Add full details (rating, note, date, link)
            </button>
          )}

          <div className="app-form-actions">
            <button
              type="button"
              className="app-form-submit"
              onClick={createNewSource}
              disabled={creatingSource}
            >
              {creatingSource ? 'Adding…' : 'Add source'}
            </button>
            {ledgerOptions.length > 0 && (
              <button
                type="button"
                className="app-form-secondary-button"
                onClick={() => {
                  setAddingNewSource(false);
                  resetNewSourceForm();
                }}
              >
                Cancel
              </button>
            )}
          </div>
        </div>
      )}

      {!addingNewSource && (
        <>
          <div className="app-form-radio-row">
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

          <button type="submit" className="app-form-submit" disabled={submitting}>
            {submitting ? 'Adding…' : 'Add to journal'}
          </button>
        </>
      )}

      {error && <p className="app-form-error">{error}</p>}
    </form>
  );
}
