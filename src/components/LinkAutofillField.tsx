import { useState } from 'react';
import { supabase } from '../lib/supabaseClient';

interface LinkMetadata {
  title: string | null;
  creator: string | null;
  coverUrl: string | null;
}

interface LinkAutofillFieldProps {
  url: string;
  onUrlChange: (url: string) => void;
  onFetched: (metadata: LinkMetadata) => void;
}

export default function LinkAutofillField({ url, onUrlChange, onFetched }: LinkAutofillFieldProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchDetails = async () => {
    if (!url.trim()) {
      setError('Paste a link first.');
      return;
    }

    setLoading(true);
    setError(null);

    const { data, error: invokeError } = await supabase.functions.invoke('fetch-link-metadata', {
      body: { url: url.trim() },
    });

    setLoading(false);

    if (invokeError) {
      setError(invokeError.message);
      return;
    }
    if (data?.error) {
      setError(data.error);
      return;
    }

    onFetched(data as LinkMetadata);
  };

  return (
    <div>
      <label>
        Link
        <input
          type="url"
          placeholder="Paste a link…"
          value={url}
          onChange={(e) => onUrlChange(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              fetchDetails();
            }
          }}
        />
      </label>
      <button type="button" onClick={fetchDetails} disabled={loading}>
        {loading ? 'Fetching…' : 'Fetch details'}
      </button>
      {error && <p style={{ color: 'crimson', fontSize: '0.85em' }}>{error}</p>}
    </div>
  );
}
