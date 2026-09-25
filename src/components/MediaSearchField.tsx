import { useState, useEffect, useRef, useId } from 'react';
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
  // Which query (media type + trimmed text) `results` were fetched for.
  // Results only count as current while this matches what's in the
  // input right now; anything else is stale and is neither shown nor
  // selectable from the keyboard.
  const [resultsKey, setResultsKey] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  // Same idea for the "Searching..." hint: keyed to the query it's for, so
  // a superseded request can't leave it stuck on screen.
  const [searchingKey, setSearchingKey] = useState<string | null>(null);
  const [resolvingId, setResolvingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const closeTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const optionRefs = useRef<Array<HTMLLIElement | null>>([]);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLUListElement>(null);
  // Bumped whenever a search starts, the person types, or a result is
  // picked. An async response only applies if the id it started with is
  // still the latest, so an older, slower search can never overwrite newer
  // results or reopen the dropdown after a selection.
  const requestIdRef = useRef(0);
  // Selecting a result updates `value` via the parent's onSelect handler
  // (it sets the title to the picked result). That value change would
  // otherwise look identical to the person typing something new, and
  // trigger another search. handleSelect records the media type + title it
  // handed to the parent here so the effect can skip exactly that value;
  // any real keystroke clears it.
  const skipSearchForRef = useRef<string | null>(null);
  const listboxId = useId();
  const optionId = (i: number) => `${listboxId}-option-${i}`;

  const currentKey = `${mediaType}:${value.trim()}`;
  const listVisible = open && resultsKey === currentKey && results.length > 0;
  const activeIndex = listVisible ? highlightedIndex : -1;

  useEffect(() => {
    if (skipSearchForRef.current === `${mediaType}:${value}`) {
      return;
    }

    const query = value.trim();
    // Empty input: nothing to search. Old results are already hidden
    // because their key no longer matches.
    if (!query) return;

    const key = `${mediaType}:${query}`;
    // Set by cleanup once this query is superseded (or on unmount).
    let cancelled = false;
    const isStale = (requestId: number) => cancelled || requestId !== requestIdRef.current;

    debounceRef.current = setTimeout(async () => {
      const requestId = ++requestIdRef.current;
      setSearchingKey(key);
      setError(null);
      try {
        const found = await SEARCH_FN[mediaType](query);
        if (isStale(requestId)) return;
        setResults(found);
        setResultsKey(key);
        setOpen(true);
        setHighlightedIndex(-1);
      } catch (err) {
        if (isStale(requestId)) return;
        setError(err instanceof Error ? err.message : 'Search failed.');
      } finally {
        if (!isStale(requestId)) setSearchingKey(null);
      }
    }, 350);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
      // Ignore anything already in flight for the old query.
      cancelled = true;
    };
  }, [value, mediaType]);

  // Fit the dropdown into the space that's actually visible below the
  // field, which on a phone is what's left above the on-screen keyboard
  // (the visual viewport), so results never run under the keyboard.
  useEffect(() => {
    if (!listVisible) return;
    const fit = () => {
      const list = listRef.current;
      const input = inputRef.current;
      if (!list || !input) return;
      const vv = window.visualViewport;
      const visibleBottom = vv ? vv.offsetTop + vv.height : window.innerHeight;
      const space = visibleBottom - input.getBoundingClientRect().bottom - 12;
      list.style.maxHeight = `${Math.max(120, Math.min(280, space))}px`;
    };
    fit();
    window.visualViewport?.addEventListener('resize', fit);
    window.visualViewport?.addEventListener('scroll', fit);
    return () => {
      window.visualViewport?.removeEventListener('resize', fit);
      window.visualViewport?.removeEventListener('scroll', fit);
    };
  }, [listVisible]);

  // Keep the keyboard-highlighted option visible when arrowing past what
  // currently fits in the scrollable dropdown.
  useEffect(() => {
    if (activeIndex < 0) return;
    optionRefs.current[activeIndex]?.scrollIntoView({ block: 'nearest' });
  }, [activeIndex]);

  const closeList = () => {
    setOpen(false);
    setHighlightedIndex(-1);
  };

  const handleSelect = async (result: MediaSearchResult) => {
    // Cancel any pending or in-flight search so it can't reopen the list.
    if (debounceRef.current) clearTimeout(debounceRef.current);
    const selectId = ++requestIdRef.current;

    if (mediaType === 'film' && result.imdbId) {
      setResolvingId(result.imdbId);
      setError(null);
      try {
        const full = await getFilmDetails(result.imdbId);
        // The person kept typing while details loaded; don't clobber it.
        if (selectId !== requestIdRef.current) return;
        skipSearchForRef.current = `${mediaType}:${full.title}`;
        onSelect(full);
      } catch (err) {
        if (selectId !== requestIdRef.current) return;
        setError(err instanceof Error ? err.message : 'Failed to load film details.');
        return;
      } finally {
        setResolvingId(null);
      }
    } else {
      skipSearchForRef.current = `${mediaType}:${result.title}`;
      onSelect(result);
    }
    setResults([]);
    setResultsKey(null);
    closeList();
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    // Keys pressed while an IME is composing belong to the IME.
    if (e.nativeEvent.isComposing) return;
    if (!listVisible) return;

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setHighlightedIndex((i) => (i + 1 >= results.length ? 0 : i + 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlightedIndex((i) => (i - 1 < 0 ? results.length - 1 : i - 1));
    } else if (e.key === 'Enter') {
      // Enter only picks a result the person has explicitly arrowed to.
      // With nothing highlighted it falls through to the form as normal,
      // keeping exactly what they typed (the manual-entry path).
      if (activeIndex >= 0 && activeIndex < results.length) {
        e.preventDefault();
        handleSelect(results[activeIndex]);
      }
    } else if (e.key === 'Escape') {
      closeList();
    }
  };

  return (
    <div className="media-search-field">
      <input
        ref={inputRef}
        type="text"
        placeholder={placeholder ?? 'Title'}
        aria-label="Title"
        value={value}
        onChange={(e) => {
          // A real edit: any highlight belonged to the previous text.
          skipSearchForRef.current = null;
          // Also supersedes a film-details lookup still in flight, so it
          // can't overwrite what's being typed now.
          requestIdRef.current++;
          setHighlightedIndex(-1);
          onChange(e.target.value);
        }}
        onFocus={() => {
          if (closeTimeoutRef.current) clearTimeout(closeTimeoutRef.current);
          if (results.length > 0) setOpen(true);
        }}
        onBlur={() => {
          // Delay so a click on a dropdown item registers before we close it.
          closeTimeoutRef.current = setTimeout(closeList, 150);
        }}
        onKeyDown={handleKeyDown}
        role="combobox"
        aria-autocomplete="list"
        aria-expanded={listVisible}
        aria-controls={listboxId}
        aria-activedescendant={activeIndex >= 0 ? optionId(activeIndex) : undefined}
      />
      {searchingKey === currentKey && <span className="media-search-status">Searching…</span>}
      {error && <p className="app-form-error">{error}</p>}

      {listVisible && (
        <ul className="media-search-results" role="listbox" id={listboxId} ref={listRef}>
          {results.map((result, i) => (
            <li
              key={result.imdbId ?? `${result.title}-${i}`}
              id={optionId(i)}
              ref={(el) => {
                optionRefs.current[i] = el;
              }}
              className={`media-search-result${i === activeIndex ? ' is-highlighted' : ''}`}
              role="option"
              aria-selected={i === activeIndex}
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
