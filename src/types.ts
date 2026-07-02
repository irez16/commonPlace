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
