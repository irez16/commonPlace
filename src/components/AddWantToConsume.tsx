import { useState } from 'react';
import type { FormEvent } from 'react';
import { supabase } from '../lib/supabaseClient';
import { MEDIA_TYPES } from '../types';
import type { MediaType, WantToConsumeItem } from '../types';

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
    <form onSubmit={handleSubmit}>
      <h3>Add to Want to Consume</h3>
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

      <input
        type="text"
        placeholder="Title"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        required
      />

      <input
        type="text"
        placeholder="Author / director / host (optional)"
        value={creator}
        onChange={(e) => setCreator(e.target.value)}
      />

      <input
        type="url"
        placeholder="Link (optional)"
        value={url}
        onChange={(e) => setUrl(e.target.value)}
      />

      <textarea
        placeholder="Note (optional)"
        value={note}
        onChange={(e) => setNote(e.target.value)}
        rows={3}
      />

      <div>
        <input
          id="is-public"
          type="checkbox"
          checked={isPublic}
          onChange={(e) => setIsPublic(e.target.checked)}
        />
        <label htmlFor="is-public">Public (visible on your profile)</label>
      </div>

      <button type="submit" disabled={loading}>
        {loading ? 'Adding…' : 'Add to list'}
      </button>
    </form>
  );
}
