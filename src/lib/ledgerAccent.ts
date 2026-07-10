// Maps the profile.ledger_accent DB value to the CSS variable holding
// the actual color for the current theme (light/dark already resolved
// by index.css's token overrides — this just picks which one).
export const LEDGER_ACCENT_OPTIONS: Record<string, { label: string; cssVar: string }> = {
  wine: { label: 'Wine', cssVar: 'var(--accent)' },
  ink: { label: 'Ink Blue', cssVar: 'var(--accent-ink)' },
  moss: { label: 'Moss', cssVar: 'var(--accent-moss)' },
};

export function resolveLedgerAccent(accent: string | null | undefined): string {
  return LEDGER_ACCENT_OPTIONS[accent ?? 'wine']?.cssVar ?? 'var(--accent)';
}
