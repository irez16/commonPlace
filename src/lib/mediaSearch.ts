// Search-as-you-type data sources for autofilling Ledger/Journal-source
// entries. Each source has a different shape, normalized here into one
// common result type so the UI doesn't need to know the differences.

export interface MediaSearchResult {
  title: string;
  creator: string | null;
  coverUrl: string | null;
  year: string | null;
  // Only present on film search results. OMDb's search endpoint doesn't
  // include the director — that requires a second lookup by this id,
  // done in getFilmDetails once the person actually picks a result.
  imdbId?: string;
}

const OMDB_API_KEY = import.meta.env.VITE_OMDB_API_KEY as string | undefined;
const GOOGLE_BOOKS_API_KEY = import.meta.env.VITE_GOOGLE_BOOKS_API_KEY as string | undefined;

// Surfaces the real status code + response body in the thrown error and
// logs the full detail to the console, instead of a generic message that
// hides what actually went wrong.
async function throwDetailedError(res: Response, label: string): Promise<never> {
  let bodyText = '';
  try {
    bodyText = await res.text();
  } catch {
    // ignore — body wasn't readable, status code alone is still useful
  }
  console.error(`${label} failed:`, res.status, res.statusText, bodyText);
  throw new Error(`${label} failed (HTTP ${res.status}). Check the browser console for details.`);
}

// Google Books: works without a key, but Google's shared keyless quota has
// gotten unreliable (429s even on a first request) — VITE_GOOGLE_BOOKS_API_KEY
// moves this onto its own 1,000/day quota instead of the exhausted global
// pool. Falls back to keyless if unset, since it does still work sometimes.
export async function searchBooks(query: string): Promise<MediaSearchResult[]> {
  if (!query.trim()) return [];

  const keyParam = GOOGLE_BOOKS_API_KEY ? `&key=${GOOGLE_BOOKS_API_KEY}` : '';
  const res = await fetch(
    `https://www.googleapis.com/books/v1/volumes?q=${encodeURIComponent(query)}&maxResults=8${keyParam}`
  );

  if (res.status === 429) {
    throw new Error(
      GOOGLE_BOOKS_API_KEY
        ? 'Book search failed (HTTP 429) — quota exceeded even with a key. Check usage in Google Cloud Console.'
        : 'Book search failed (HTTP 429) — Google\'s free unauthenticated quota is exhausted. Add VITE_GOOGLE_BOOKS_API_KEY to fix this.'
    );
  }
  if (!res.ok) await throwDetailedError(res, 'Book search');

  const data = await res.json();

  return (data.items ?? []).map((item: any) => ({
    title: item.volumeInfo?.title ?? 'Untitled',
    creator: item.volumeInfo?.authors?.join(', ') ?? null,
    coverUrl: item.volumeInfo?.imageLinks?.thumbnail ?? null,
    year: item.volumeInfo?.publishedDate?.slice(0, 4) ?? null,
  }));
}

// iTunes Search API: free, no API key, safe to call directly from the
// browser. Returns everything needed in one call — no follow-up lookup.
export async function searchPodcasts(query: string): Promise<MediaSearchResult[]> {
  if (!query.trim()) return [];

  const res = await fetch(
    `https://itunes.apple.com/search?term=${encodeURIComponent(query)}&media=podcast&limit=8`
  );
  if (!res.ok) await throwDetailedError(res, 'Podcast search');

  const data = await res.json();

  return (data.results ?? []).map((item: any) => ({
    title: item.collectionName ?? 'Untitled',
    creator: item.artistName ?? null,
    coverUrl: item.artworkUrl100 ?? null,
    year: item.releaseDate ? String(item.releaseDate).slice(0, 4) : null,
  }));
}

// OMDb: requires a free API key (VITE_OMDB_API_KEY). The search endpoint
// only returns title/year/poster — director requires a second call by
// imdbID, made in getFilmDetails once a result is actually selected
// rather than for every row in the dropdown (keeps the search itself fast
// and avoids burning quota on results the person never picks).
export async function searchFilms(query: string): Promise<MediaSearchResult[]> {
  if (!query.trim()) return [];
  if (!OMDB_API_KEY) {
    throw new Error('Film search is not configured (missing VITE_OMDB_API_KEY).');
  }

  const res = await fetch(
    `https://www.omdbapi.com/?apikey=${OMDB_API_KEY}&s=${encodeURIComponent(query)}&type=movie`
  );
  if (!res.ok) await throwDetailedError(res, 'Film search');

  const data = await res.json();
  if (data.Response === 'False') {
    // OMDb returns 200 OK with Response:"False" for both "no results" and
    // real errors (like an invalid key) — surface the latter, not just
    // silently show zero results.
    if (data.Error && data.Error !== 'Movie not found!') {
      console.error('Film search failed:', data.Error);
      throw new Error(`Film search failed: ${data.Error}`);
    }
    return [];
  }

  return (data.Search ?? []).map((item: any) => ({
    title: item.Title,
    creator: null,
    coverUrl: item.Poster && item.Poster !== 'N/A' ? item.Poster : null,
    year: item.Year ?? null,
    imdbId: item.imdbID,
  }));
}

export async function getFilmDetails(imdbId: string): Promise<MediaSearchResult> {
  if (!OMDB_API_KEY) {
    throw new Error('Film search is not configured (missing VITE_OMDB_API_KEY).');
  }

  const res = await fetch(`https://www.omdbapi.com/?apikey=${OMDB_API_KEY}&i=${imdbId}`);
  if (!res.ok) await throwDetailedError(res, 'Film details lookup');

  const data = await res.json();

  return {
    title: data.Title,
    creator: data.Director && data.Director !== 'N/A' ? data.Director : null,
    coverUrl: data.Poster && data.Poster !== 'N/A' ? data.Poster : null,
    year: data.Year ?? null,
    imdbId,
  };
}
