// Maps the (currently always-null-until-Settings-exists) profile.journal_font
// column to a real CSS font-family stack. Keys are what Settings will
// eventually write to that column; values are what actually gets loaded
// via the Google Fonts link in index.html.
export const JOURNAL_FONT_OPTIONS: Record<string, string> = {
  caveat: "'Caveat', cursive",
  kalam: "'Kalam', cursive",
  'homemade-apple': "'Homemade Apple', cursive",
  'patrick-hand': "'Patrick Hand', cursive",
  'shadows-into-light': "'Shadows Into Light', cursive",
};

export const DEFAULT_JOURNAL_FONT = JOURNAL_FONT_OPTIONS.caveat;

export function resolveJournalFont(journalFont: string | null): string {
  if (!journalFont) return DEFAULT_JOURNAL_FONT;
  return JOURNAL_FONT_OPTIONS[journalFont] ?? DEFAULT_JOURNAL_FONT;
}
