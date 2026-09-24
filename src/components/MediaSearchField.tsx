import { useState, useEffect, useRef } from 'react';
import type { KeyboardEvent } from 'react';
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
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const closeTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const optionRefs = useRef<Array<HTMLLIElement | null>>([]);
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
      setHighlightedIndex(-1);
      return;
    }

    debounceRef.current = setTimeout(async () => {
      setSearching(true);
      setError(null);
      try {
        const found = await SEARCH_FN[mediaType](value);
        setResults(found);
        setOpen(true);
        setHighlightedIndex(-1);
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

  // Keep the keyboard-highlighted option visible when arrowing past what
  // currently fits in the scrollable dropdown.
  useEffect(() => {
    if (highlightedIndex < 0) return;
    optionRefs.current[highlightedIndex]?.scrollIntoView({ block: 'nearest' });
  }, [highlightedIndex]);

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
    setHighlightedIndex(-1);
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (!open || results.length === 0) return;

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setHighlightedIndex((i) => (i + 1 >= results.length ? 0 : i + 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlightedIndex((i) => (i - 1 < 0 ? results.length - 1 : i - 1));
    } else if (e.key === 'Enter') {
      // No highlight yet (the most common flow: type, then hit Enter
      // immediately) — treat it as picking the top/best match, same as
      // a standard combobox, rather than letting the keystroke fall
      // through to a native form submit with unresolved text.
      const indexToSelect = highlightedIndex >= 0 ? highlightedIndex : 0;
      if (indexToSelect < results.length) {
        e.preventDefault();
        handleSelect(results[indexToSelect]);
      }
    } else if (e.key === 'Escape') {
      setOpen(false);
      setHighlightedIndex(-1);
    }
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
        onKeyDown={handleKeyDown}
        role="combobox"
        aria-expanded={open}
        aria-controls="media-search-results-listbox"
        aria-activedescendant={
          highlightedIndex >= 0 ? `media-search-option-${highlightedIndex}` : undefined
        }
      />
      {searching && <span className="media-search-status">Searching…</span>}
      {error && <p className="app-form-error">{error}</p>}

      {open && results.length > 0 && (
        <ul className="media-search-results" role="listbox" id="media-search-results-listbox">
          {results.map((result, i) => (
            <li
              key={result.imdbId ?? `${result.title}-${i}`}
              id={`media-search-option-${i}`}
              ref={(el) => {
                optionRefs.current[i] = el;
              }}
              className={`media-search-result${i === highlightedIndex ? ' is-highlighted' : ''}`}
              role="option"
              aria-selected={i === highlightedIndex}
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
