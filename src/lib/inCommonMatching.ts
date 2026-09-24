import { supabase } from './supabaseClient';
import type { Passage } from '../types';

// Minimum number of shared words required before an overlap counts as a
// real match, not incidental phrasing (e.g. "and then she said" showing
// up in two unrelated clips from the same book).
const MIN_SHARED_WORDS = 6;

// Lowercases, strips punctuation, and collapses whitespace so formatting
// differences (smart quotes, a trailing period, extra spaces from a
// copy-paste) don't block a match that's otherwise identical. NFC first,
// so an accented letter typed as letter + combining mark (which the
// punctuation strip would otherwise eat) compares equal to the
// precomposed form.
export function normalize(text: string): string {
  return text
    .normalize('NFC')
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function wordCount(text: string): number {
  return text.split(' ').filter(Boolean).length;
}

// Two clips count as "the same passage" if, after normalizing, the
// shorter one is fully contained within the longer one (so quoting half a
// sentence still matches someone who clipped the whole thing) AND that
// shared text is long enough to be a real phrase rather than a trivial
// coincidence. This is intentionally exact containment, not fuzzy/
// approximate similarity — approximate matching risks flagging two
// genuinely different sentences as "the same," which would undercut the
// whole point of the feature the first time it happened.
function isMeaningfulOverlap(textA: string, textB: string): boolean {
  const a = normalize(textA);
  const b = normalize(textB);
  if (!a || !b) return false;

  const shorter = a.length <= b.length ? a : b;
  const longer = a.length <= b.length ? b : a;

  if (!longer.includes(shorter)) return false;

  return wordCount(shorter) >= MIN_SHARED_WORDS;
}

// Two ledger entries count as "the same work" when their normalized titles
// match (and aren't empty) and their normalized creators match. A missing
// creator is treated as an empty string, so "Middlemarch" with no author
// only matches another "Middlemarch" with no author, not "Middlemarch" by
// George Eliot. Creators are compared with all spaces removed, so
// "J.R.R. Tolkien" and "J. R. R. Tolkien" are the same person. Each person
// logs their own ledger entry for a book, so this is what lets two
// people's clips from the same book be compared.
export function sameWork(
  aTitle: string,
  aCreator: string | null,
  bTitle: string,
  bCreator: string | null
): boolean {
  const titleA = normalize(aTitle);
  if (!titleA || titleA !== normalize(bTitle)) return false;
  const creatorKey = (creator: string | null) => normalize(creator ?? '').replace(/\s/g, '');
  return creatorKey(aCreator) === creatorKey(bCreator);
}

// A coarse server-side ILIKE pattern for titles that could be sameWork()
// with `title`, so we don't download every follower's whole Ledger. It
// only narrows: sameWork() still decides. Built from the longest word of
// the normalized title with a wildcard between every character, because
// normalize() drops punctuation ("Don't" and "Dont" must both match
// "dont"). Only ASCII letters and digits are kept; anything else becomes
// a wildcard, which sidesteps Unicode case folding and composed/decomposed
// accents in the database. That also means no ILIKE metacharacters
// (%, _ or \) can reach the pattern. Returns null when there's nothing
// usable (e.g. a title in a non-Latin script), meaning "don't filter".
export function coarseTitlePattern(title: string): string | null {
  const longestWord = normalize(title)
    .split(' ')
    .reduce((best, word) => (word.length > best.length ? word : best), '');
  const chars = longestWord.replace(/[^a-z0-9]/g, '');
  if (!chars) return null;
  return `%${chars.split('').join('%')}%`;
}

// Keeps each .in() list (and so the request URL) a sensible length.
const FOLLOWER_BATCH_SIZE = 100;

// Called right after a new passage is created. Only text clips can match
// today; there's no meaningful "same passage" check for image/video/audio
// yet. Matching is scoped to clips from the *same work*: the new clip's
// ledger entry is compared by title + creator (see sameWork) against the
// ledger entries of everyone who follows the clip's author, since each
// person logs their own entry for a book. That scoping is what makes the
// looser containment check above safe: two overlapping phrases from the
// same book are a meaningful signal, but the same overlap between two
// unrelated books would just be coincidence.
//
// Direction: the author's followers who clipped the same passage are the
// ones notified (recipient = follower, other_user = the new clip's author).
export async function notifyInCommonMatches(newPassage: Passage): Promise<void> {
  if (newPassage.clip_type !== 'text' || !newPassage.clipped_text) return;

  const { data: newEntry, error: entryError } = await supabase
    .from('ledger_entries')
    .select('title, creator')
    .eq('id', newPassage.ledger_entry_id)
    .maybeSingle();

  if (entryError || !newEntry) return;

  const { data: followRows, error: followError } = await supabase
    .from('follows')
    .select('follower_id')
    .eq('followee_id', newPassage.user_id);

  if (followError || !followRows || followRows.length === 0) return;

  const followerIds = followRows.map((row) => row.follower_id as string);

  const titlePattern = coarseTitlePattern(newEntry.title as string);
  const followerEntries: { id: string; user_id: string; title: string; creator: string | null }[] =
    [];
  for (let i = 0; i < followerIds.length; i += FOLLOWER_BATCH_SIZE) {
    let request = supabase
      .from('ledger_entries')
      .select('id, user_id, title, creator')
      .in('user_id', followerIds.slice(i, i + FOLLOWER_BATCH_SIZE));
    if (titlePattern) request = request.ilike('title', titlePattern);
    const { data, error: followerEntriesError } = await request;
    if (followerEntriesError || !data) return;
    followerEntries.push(...data);
  }

  const matchedEntryIds = followerEntries
    .filter((entry) =>
      sameWork(
        newEntry.title as string,
        newEntry.creator as string | null,
        entry.title as string,
        entry.creator as string | null
      )
    )
    .map((entry) => entry.id as string);

  if (matchedEntryIds.length === 0) return;

  const { data: candidatePassages, error: matchError } = await supabase
    .from('passages')
    .select('id, user_id, clipped_text')
    .in('ledger_entry_id', matchedEntryIds)
    .eq('clip_type', 'text');

  if (matchError || !candidatePassages || candidatePassages.length === 0) return;

  // One notification per follower for this new clip, even if they have
  // several matching passages (e.g. two Ledger entries for the same work).
  const notifiedRecipients = new Set<string>();
  const notifications = candidatePassages
    .filter((candidate) => {
      if (notifiedRecipients.has(candidate.user_id as string)) return false;
      const matches =
        !!candidate.clipped_text &&
        isMeaningfulOverlap(candidate.clipped_text, newPassage.clipped_text!);
      if (matches) notifiedRecipients.add(candidate.user_id as string);
      return matches;
    })
    .map((match) => ({
      recipient_id: match.user_id,
      other_user_id: newPassage.user_id,
      my_passage_id: match.id,
      their_passage_id: newPassage.id,
    }));

  if (notifications.length === 0) return;

  // Best-effort: a failure here shouldn't surface as an error on the add
  // form, since the clip itself was already saved successfully.
  await supabase.from('in_common_notifications').insert(notifications);
}
