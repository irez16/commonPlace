// journal_cover_color stores a plain hex string directly (unlike
// ledger_accent, which stores a key). These are just the preset swatches
// offered in Settings — a user could theoretically end up with any hex
// value here, the picker just doesn't offer arbitrary choice today.
export const JOURNAL_COLOR_PRESETS: { label: string; hex: string }[] = [
  { label: 'Navy', hex: '#1F3A54' },
  { label: 'Forest', hex: '#2F4A3A' },
  { label: 'Burgundy', hex: '#6B2E3F' },
  { label: 'Charcoal', hex: '#33302B' },
  { label: 'Plum', hex: '#4A3358' },
];

export const DEFAULT_JOURNAL_COLOR = JOURNAL_COLOR_PRESETS[0].hex;
