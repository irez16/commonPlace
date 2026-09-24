import { useEffect, useRef, useState } from 'react';
import { supabase } from '../lib/supabaseClient';
import type { Profile } from '../types';

export type PersonResult = Pick<Profile, 'id' | 'username' | 'name' | 'avatar_url' | 'ledger_accent'>;

interface PeopleSearchState {
  // True once the (sanitized) query is long enough to search at all;
  // callers use this to decide whether to show results instead of the feed.
  active: boolean;
  loading: boolean;
  error: string | null;
  results: PersonResult[];
}

const MIN_QUERY_LENGTH = 2;
const DEBOUNCE_MS = 250;

// Strips a leading "@" (people often type handles that way) and anything
// that isn't a letter, digit, space, underscore, period or hyphen. That
// keeps the value safe to interpolate into a PostgREST .or() filter,
// where commas, parentheses and "*" have special meaning. NFC so an
// accented name typed in decomposed form matches the stored one.
export function sanitizePeopleQuery(raw: string): string {
  return raw
    .normalize('NFC')
    .trim()
    .replace(/^@+/, '')
    .replace(/[^\p{L}\p{N} _.-]/gu, '')
    .trim();
}

// Makes ILIKE wildcards literal, so "jane_doe" doesn't also match
// "janeXdoe". "%" and "\\" can't survive sanitizePeopleQuery, but are
// escaped too in case that ever changes. The value goes into .or()
// unquoted, where PostgREST passes backslashes through to Postgres as-is
// (only quoted values treat backslash as an escape).
function escapeLikePattern(value: string): string {
  return value.replace(/[\\%_]/g, '\\$&');
}

const SEARCH_ERROR = "Search isn't working right now. Try again in a moment.";

export function usePeopleSearch(rawQuery: string, viewerId: string | null): PeopleSearchState {
  const query = sanitizePeopleQuery(rawQuery);
  const active = query.length >= MIN_QUERY_LENGTH;

  // The latest settled response, tagged with the query it answers.
  // Loading is derived (no settled result for the current query yet)
  // so nothing sets state synchronously inside the effect.
  const [settled, setSettled] = useState<{
    query: string;
    results: PersonResult[];
    error: string | null;
  } | null>(null);
  // Sequence counter: only the most recent request may write state, so a
  // slow response for "ma" can't replace the results for "mari".
  const requestSeq = useRef(0);

  useEffect(() => {
    const seq = ++requestSeq.current;
    if (!active) return;

    const timer = window.setTimeout(async () => {
      const pattern = escapeLikePattern(query);
      let request = supabase
        .from('public_profiles')
        .select('id, username, name, avatar_url, ledger_accent')
        .or(`username.ilike.*${pattern}*,name.ilike.*${pattern}*`)
        .limit(20);
      if (viewerId) request = request.neq('id', viewerId);

      const { data, error } = await request;

      if (seq !== requestSeq.current) return;

      setSettled({
        query,
        results: error ? [] : ((data ?? []) as PersonResult[]),
        // Fixed copy: raw server text isn't useful to the person searching.
        error: error ? SEARCH_ERROR : null,
      });
    }, DEBOUNCE_MS);

    return () => window.clearTimeout(timer);
  }, [query, active, viewerId]);

  if (!active) return { active: false, loading: false, error: null, results: [] };

  const current = settled?.query === query ? settled : null;
  return {
    active: true,
    loading: current === null,
    error: current?.error ?? null,
    results: current?.results ?? [],
  };
}
