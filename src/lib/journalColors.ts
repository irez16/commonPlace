// journal_cover_color stores a plain hex string directly (unlike
// ledger_accent, which stores a key). These are just the preset swatches
// offered in Settings — a user could theoretically end up with any hex
// value here, the picker just doesn't offer arbitrary choice today.
export const JOURNAL_COLOR_PRESETS: { label: string; hex: string }[] = [
  { label: 'Navy', hex: '#2B577D' },
  { label: 'Forest', hex: '#3D6B4F' },
  { label: 'Burgundy', hex: '#8C3F58' },
  { label: 'Charcoal', hex: '#55503F' },
  { label: 'Plum', hex: '#6B4A82' },
];

export const DEFAULT_JOURNAL_COLOR = JOURNAL_COLOR_PRESETS[0].hex;
