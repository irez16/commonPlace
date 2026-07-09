import { useState } from 'react';
import type { FormEvent } from 'react';
import { supabase } from '../lib/supabaseClient';
import { MEDIA_TYPES } from '../types';
import type { MediaType, LedgerEntry } from '../types';
import MediaSearchField, { supportsSearch } from './MediaSearchField';
import LinkAutofillField from './LinkAutofillField';
import type { MediaSearchResult } from '../lib/mediaSearch';

const LINK_AUTOFILL_TYPES: MediaType[] = ['youtube', 'substack', 'essay'];

interface AddLedgerEntryProps {
  userId: string;
  onAdded?: (entry: LedgerEntry) => void;
}

export default function AddLedgerEntry({ userId, onAdded }: AddLedgerEntryProps) {
  const [mediaType, setMediaType] = useState<MediaType>('book');
  const [title, setTitle] = useState('');
  const [creator, setCreator] = useState('');
  const [url, setUrl] = useState('');
  const [consumedDate, setConsumedDate] = useState(
    new Date().toISOString().slice(0, 10)
  );
  const [rating, setRating] = useState('');
  const [note, setNote] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleAutofill = (result: MediaSearchResult) => {
    setTitle(result.title);
    setCreator(result.creator ?? '');
  };

  const handleLinkFetched = (metadata: { title: string | null; creator: string | null }) => {
    if (metadata.title) setTitle(metadata.title);
    if (metadata.creator) setCreator(metadata.creator);
  };

  const resetForm = () => {
    setMediaType('book');
    setTitle('');
    setCreator('');
    setUrl('');
    setConsumedDate(new Date().toISOString().slice(0, 10));
    setRating('');
    setNote('');
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!title.trim()) {
      setError('Title is required.');
      return;
    }

    setLoading(true);

    const { data, error: insertError } = await supabase
      .from('ledger_entries')
      .insert({
        user_id: userId,
        media_type: mediaType,
        title: title.trim(),
        creator: creator.trim() || null,
        url: url.trim() || null,
        consumed_date: consumedDate,
        rating: rating ? Number(rating) : null,
        note: note.trim() || null,
      })
      .select()
      .single();

    setLoading(false);

    if (insertError) {
      setError(insertError.message);
      return;
    }

    resetForm();
    onAdded?.(data as LedgerEntry);
  };

  return (
    <form onSubmit={handleSubmit}>
      <h3>Add to your ledger</h3>
      {error && <p style={{ color: 'crimson' }}>{error}</p>}

      <label>
        Type
        <select
          value={mediaType}
          onChange={(e) => setMediaType(e.target.value as MediaType)}
        >
          {MEDIA_TYPES.map((type) => (
            <option key={type} value={type}>
              {type}
            </option>
          ))}
        </select>
      </label>

      {LINK_AUTOFILL_TYPES.includes(mediaType) && (
        <LinkAutofillField url={url} onUrlChange={setUrl} onFetched={handleLinkFetched} />
      )}

      {supportsSearch(mediaType) ? (
        <MediaSearchField
          mediaType={mediaType}
          value={title}
          onChange={setTitle}
          onSelect={handleAutofill}
          placeholder="Title — start typing to search"
        />
      ) : (
        <input
          type="text"
          placeholder="Title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          required
        />
      )}

      <input
        type="text"
        placeholder="Author / director / host (optional)"
        value={creator}
        onChange={(e) => setCreator(e.target.value)}
      />

      {!LINK_AUTOFILL_TYPES.includes(mediaType) && (
        <input
          type="url"
          placeholder="Link (optional)"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
        />
      )}

      <label>
        Date consumed
        <input
          type="date"
          value={consumedDate}
          onChange={(e) => setConsumedDate(e.target.value)}
          required
        />
      </label>

      <label>
        Rating (optional)
        <select value={rating} onChange={(e) => setRating(e.target.value)}>
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
        value={note}
        onChange={(e) => setNote(e.target.value)}
        rows={3}
      />

      <button type="submit" disabled={loading}>
        {loading ? 'Adding…' : 'Add entry'}
      </button>
    </form>
  );
}
