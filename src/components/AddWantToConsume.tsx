import { useState } from 'react';
import type { FormEvent } from 'react';
import { supabase } from '../lib/supabaseClient';
import { MEDIA_TYPES } from '../types';
import type { MediaType, WantToConsumeItem } from '../types';
import MediaSearchField, { supportsSearch } from './MediaSearchField';
import LinkAutofillField from './LinkAutofillField';
import type { MediaSearchResult } from '../lib/mediaSearch';
import './AppForm.css';

const LINK_AUTOFILL_TYPES: MediaType[] = ['youtube', 'substack', 'essay'];

interface AddWantToConsumeProps {
  userId: string;
  onAdded?: (item: WantToConsumeItem) => void;
}

export default function AddWantToConsume({ userId, onAdded }: AddWantToConsumeProps) {
  const [mediaType, setMediaType] = useState<MediaType>('book');
  const [title, setTitle] = useState('');
  const [creator, setCreator] = useState('');
  const [url, setUrl] = useState('');
  const [note, setNote] = useState('');
  const [isPublic, setIsPublic] = useState(true);
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
    setNote('');
    setIsPublic(true);
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
      .from('want_to_consume')
      .insert({
        user_id: userId,
        media_type: mediaType,
        title: title.trim(),
        creator: creator.trim() || null,
        url: url.trim() || null,
        note: note.trim() || null,
        is_public: isPublic,
      })
      .select()
      .single();

    setLoading(false);

    if (insertError) {
      setError(insertError.message);
      return;
    }

    resetForm();
    onAdded?.(data as WantToConsumeItem);
  };

  return (
    <form className="app-form" onSubmit={handleSubmit}>
      <h3>Add to Want to Consume</h3>
      {error && <p className="app-form-error">{error}</p>}

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

      <textarea
        placeholder="Note (optional)"
        value={note}
        onChange={(e) => setNote(e.target.value)}
        rows={3}
      />

      <div className="app-form-checkbox-row">
        <input
          id="is-public"
          type="checkbox"
          checked={isPublic}
          onChange={(e) => setIsPublic(e.target.checked)}
        />
        <label htmlFor="is-public">Public (visible on your profile)</label>
      </div>

      <button type="submit" className="app-form-submit" disabled={loading}>
        {loading ? 'Adding…' : 'Add to list'}
      </button>
    </form>
  );
}
