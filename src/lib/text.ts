// Character-count truncation for note/review text shown on a card —
// roughly 1.5-2 lines at typical card text size. Plain ellipsis, no
// "read more" link; cards using this are tappable through to a full
// detail view for the untruncated text instead.
const NOTE_TRUNCATE_LENGTH = 140;

export function truncateNote(note: string): string {
  if (note.length <= NOTE_TRUNCATE_LENGTH) return note;
  return note.slice(0, NOTE_TRUNCATE_LENGTH).trimEnd() + '…';
}
