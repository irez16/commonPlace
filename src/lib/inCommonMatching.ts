import { supabase } from './supabaseClient';
import type { Passage } from '../types';

// Minimum number of shared words required before an overlap counts as a
// real match, not incidental phrasing (e.g. "and then she said" showing
// up in two unrelated clips from the same book).
const MIN_SHARED_WORDS = 6;

// Lowercases, strips punctuation, and collapses whitespace so formatting
// differences (smart quotes, a trailing period, extra spaces from a
// copy-paste) don't block a match that's otherwise identical.
function normalize(text: string): string {
  return text
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

// Called right after a new passage is created. Only text clips can match
// today — there's no meaningful "same passage" check for image/video/audio
// yet. Matching is scoped to clips from the *same ledger entry* — this is
// what makes the looser containment check above safe: two overlapping
// phrases from the same book are a meaningful signal, but the same
// overlap between two unrelated books would just be coincidence.
export async function notifyInCommonMatches(newPassage: Passage): Promise<void> {
  if (newPassage.clip_type !== 'text' || !newPassage.clipped_text) return;

  const { data: followRows, error: followError } = await supabase
    .from('follows')
    .select('follower_id')
    .eq('followee_id', newPassage.user_id);

  if (followError || !followRows || followRows.length === 0) return;

  const followerIds = followRows.map((row) => row.follower_id as string);

  const { data: candidatePassages, error: matchError } = await supabase
    .from('passages')
    .select('id, user_id, clipped_text')
    .in('user_id', followerIds)
    .eq('clip_type', 'text')
    .eq('ledger_entry_id', newPassage.ledger_entry_id);

  if (matchError || !candidatePassages || candidatePassages.length === 0) return;

  const notifications = candidatePassages
    .filter(
      (candidate) =>
        candidate.clipped_text &&
        isMeaningfulOverlap(candidate.clipped_text, newPassage.clipped_text!)
    )
    .map((match) => ({
      recipient_id: match.user_id,
      other_user_id: newPassage.user_id,
      my_passage_id: match.id,
      their_passage_id: newPassage.id,
    }));

  if (notifications.length === 0) return;

  // Best-effort — a failure here shouldn't surface as an error on the add
  // form, since the clip itself was already saved successfully.
  await supabase.from('in_common_notifications').insert(notifications);
}
