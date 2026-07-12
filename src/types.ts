export type MediaType =
  | 'book'
  | 'essay'
  | 'film'
  | 'youtube'
  | 'substack'
  | 'podcast';

export const MEDIA_TYPES: MediaType[] = [
  'book',
  'essay',
  'film',
  'youtube',
  'substack',
  'podcast',
];

export const MEDIA_TYPE_LABELS: Record<MediaType, string> = {
  book: 'Book',
  essay: 'Essay',
  film: 'Film',
  youtube: 'YouTube',
  substack: 'Substack',
  podcast: 'Podcast',
};

export interface LedgerEntry {
  id: string;
  user_id: string;
  media_type: MediaType;
  title: string;
  creator: string | null;
  url: string | null;
  consumed_date: string; // YYYY-MM-DD
  rating: number | null;
  note: string | null;
  created_at: string;
  updated_at: string;
}

export interface Profile {
  id: string;
  username: string;
  name: string;
  currently: string | null;
  bio: string | null;
  avatar_url: string | null;
  journal_cover_color: string | null;
  journal_font: string | null;
  journal_layout: string | null;
  pinned_ledger_entry_id: string | null;
  // Requires a migration — see settings_migration.sql. Not null: the
  // DB column has a default of 'wine', same as every profile had
  // implicitly before this column existed.
  ledger_accent: 'wine' | 'ink' | 'moss';
  created_at: string;
}

export interface Follow {
  follower_id: string;
  followee_id: string;
  created_at: string;
}

export interface WantToConsumeItem {
  id: string;
  user_id: string;
  media_type: MediaType;
  title: string;
  creator: string | null;
  url: string | null;
  note: string | null;
  is_public: boolean;
  promoted_ledger_entry_id: string | null;
  source_ledger_entry_id: string | null;
  created_at: string;
}

export type ClipType = 'text' | 'image' | 'video' | 'audio';

export const CLIP_TYPES: ClipType[] = ['text', 'image', 'video', 'audio'];

export interface Passage {
  id: string;
  user_id: string;
  ledger_entry_id: string;
  clip_type: ClipType;
  clipped_text: string | null;
  media_path: string | null;
  annotation: string | null;
  page_or_timestamp: string | null;
  created_at: string;
  updated_at: string;
}

export interface InCommonNotification {
  id: string;
  recipient_id: string;
  other_user_id: string;
  my_passage_id: string;
  their_passage_id: string;
  is_read: boolean;
  created_at: string;
}
