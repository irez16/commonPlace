import { useState, useEffect, useRef } from 'react';
import { searchBooks, searchPodcasts, searchFilms, getFilmDetails } from '../lib/mediaSearch';
import type { MediaSearchResult } from '../lib/mediaSearch';
import type { MediaType } from '../types';
import './AppForm.css';
import './MediaSearchField.css';

interface MediaSearchFieldProps {
  mediaType: 'book' | 'podcast' | 'film';
  value: string;
  onChange: (title: string) => void;
  onSelect: (result: MediaSearchResult) => void;
  placeholder?: string;
}

const SEARCH_FN: Record<MediaSearchFieldProps['mediaType'], (q: string) => Promise<MediaSearchResult[]>> = {
  book: searchBooks,
  podcast: searchPodcasts,
  film: searchFilms,
};

// Supported here vs. left as plain manual entry elsewhere.
export function supportsSearch(mediaType: MediaType): mediaType is 'book' | 'podcast' | 'film' {
  return mediaType === 'book' || mediaType === 'podcast' || mediaType === 'film';
}

export default function MediaSearchField({
  mediaType,
  value,
  onChange,
  onSelect,
  placeholder,
}: MediaSearchFieldProps) {
  const [results, setResults] = useState<MediaSearchResult[]>([]);
  const [open, setOpen] = useState(false);
  const [searching, setSearching] = useState(false);
  const [resolvingId, setResolvingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const closeTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Selecting a result updates `value` via the parent's onSelect handler
  // (it sets the title to the picked result). That value change would
  // otherwise look identical to the person typing something new, and
  // trigger another search. This flag lets handleSelect mark the very
  // next value change as "not a real edit" so it's skipped.
  const skipNextSearchRef = useRef(false);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);

    if (skipNextSearchRef.current) {
      skipNextSearchRef.current = false;
      return;
    }

    if (!value.trim()) {
      setResults([]);
      setOpen(false);
      return;
    }

    debounceRef.current = setTimeout(async () => {
      setSearching(true);
      setError(null);
      try {
        const found = await SEARCH_FN[mediaType](value);
        setResults(found);
        setOpen(true);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Search failed.');
      } finally {
        setSearching(false);
      }
    }, 350);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value, mediaType]);

  const handleSelect = async (result: MediaSearchResult) => {
    skipNextSearchRef.current = true;

    if (mediaType === 'film' && result.imdbId) {
      setResolvingId(result.imdbId);
      setError(null);
      try {
        const full = await getFilmDetails(result.imdbId);
        onSelect(full);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load film details.');
        skipNextSearchRef.current = false;
        return;
      } finally {
        setResolvingId(null);
      }
    } else {
      onSelect(result);
    }
    setResults([]);
    setOpen(false);
  };

  return (
    <div className="media-search-field">
      <input
        type="text"
        placeholder={placeholder ?? 'Title'}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onFocus={() => results.length > 0 && setOpen(true)}
        onBlur={() => {
          // Delay so a click on a dropdown item registers before we close it.
          closeTimeoutRef.current = setTimeout(() => setOpen(false), 150);
        }}
      />
      {searching && <span className="media-search-status">Searching…</span>}
      {error && <p className="app-form-error">{error}</p>}

      {open && results.length > 0 && (
        <ul className="media-search-results">
          {results.map((result, i) => (
            <li
              key={result.imdbId ?? `${result.title}-${i}`}
              className="media-search-result"
              onMouseDown={(e) => {
                // onMouseDown fires before the input's onBlur, so the click
                // registers before the dropdown closes.
                e.preventDefault();
                handleSelect(result);
              }}
            >
              {result.coverUrl && (
                <img className="media-search-result-cover" src={result.coverUrl} alt="" />
              )}
              <div>
                <div className="media-search-result-title">{result.title}</div>
                <div className="media-search-result-meta">
                  {result.creator}
                  {result.creator && result.year ? ' · ' : ''}
                  {result.year}
                  {mediaType === 'film' && resolvingId === result.imdbId && ' · loading details…'}
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
