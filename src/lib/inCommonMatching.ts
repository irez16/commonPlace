import { supabase } from './supabaseClient';
import type { Passage } from '../types';

// Called right after a new passage is created. Only text clips can match
// today — there's no meaningful "same passage" check for image/video/audio
// yet. Matching is a simple exact match on the trimmed clip text (all
// clips are already trimmed on insert), not fuzzy — reliable and easy to
// reason about, at the cost of missing near-identical quotes.
export async function notifyInCommonMatches(newPassage: Passage): Promise<void> {
  if (newPassage.clip_type !== 'text' || !newPassage.clipped_text) return;

  const { data: followRows, error: followError } = await supabase
    .from('follows')
    .select('follower_id')
    .eq('followee_id', newPassage.user_id);

  if (followError || !followRows || followRows.length === 0) return;

  const followerIds = followRows.map((row) => row.follower_id as string);

  const { data: matchingPassages, error: matchError } = await supabase
    .from('passages')
    .select('id, user_id')
    .in('user_id', followerIds)
    .eq('clip_type', 'text')
    .eq('clipped_text', newPassage.clipped_text);

  if (matchError || !matchingPassages || matchingPassages.length === 0) return;

  const notifications = matchingPassages.map((match) => ({
    recipient_id: match.user_id,
    other_user_id: newPassage.user_id,
    my_passage_id: match.id,
    their_passage_id: newPassage.id,
  }));

  // Best-effort — a failure here shouldn't surface as an error on the add
  // form, since the clip itself was already saved successfully.
  await supabase.from('in_common_notifications').insert(notifications);
}
