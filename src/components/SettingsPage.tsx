import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient';
import { useProfileStatus } from '../hooks/useProfileStatus';
import { usePublicProfile } from '../hooks/usePublicProfile';
import { LEDGER_ACCENT_OPTIONS } from '../lib/ledgerAccent';
import { JOURNAL_COLOR_PRESETS } from '../lib/journalColors';
import { JOURNAL_FONT_OPTIONS } from '../lib/journalFonts';
import './SettingsPage.css';

// Own-account settings: Ledger accent (3 options) + Journal
// customization (ink color + handwriting font). Both journal fields
// were already columns on `profiles`, just unused until now.
// ledger_accent is a new column — see settings_migration.sql.
export default function SettingsPage() {
  const { username } = useProfileStatus();
  const { loading, profile } = usePublicProfile(username);

  const [ledgerAccent, setLedgerAccent] = useState<'wine' | 'ink' | 'moss'>('wine');
  const [journalColor, setJournalColor] = useState(JOURNAL_COLOR_PRESETS[0].hex);
  const [journalFont, setJournalFont] = useState('caveat');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!profile) return;
    setLedgerAccent(profile.ledger_accent ?? 'wine');
    setJournalColor(profile.journal_cover_color ?? JOURNAL_COLOR_PRESETS[0].hex);
    setJournalFont(profile.journal_font ?? 'caveat');
  }, [profile]);

  if (!username) {
    return (
      <div className="settings-page">
        <p>You need to be signed in to view settings.</p>
      </div>
    );
  }

  if (loading || !profile) return <div className="settings-page">Loading…</div>;

  const save = async () => {
    setSaving(true);
    setSaved(false);
    setError(null);

    const { error: updateError } = await supabase
      .from('profiles')
      .update({
        ledger_accent: ledgerAccent,
        journal_cover_color: journalColor,
        journal_font: journalFont,
      })
      .eq('id', profile.id);

    setSaving(false);

    if (updateError) {
      setError(updateError.message);
      return;
    }

    setSaved(true);
  };

  return (
    <div className="settings-page">
      <Link className="settings-page-breadcrumb" to={`/@${username}`}>
        ← @{username}
      </Link>
      <h1>Settings</h1>

      <div className="settings-section">
        <h2>Ledger accent</h2>
        <p className="settings-section-hint">
          The accent color for your Ledger cards, pin icon, and entry pages.
        </p>
        <div className="settings-swatch-row">
          {Object.entries(LEDGER_ACCENT_OPTIONS).map(([key, opt]) => (
            <button
              key={key}
              type="button"
              className={`settings-swatch${ledgerAccent === key ? ' is-selected' : ''}`}
              onClick={() => setLedgerAccent(key as 'wine' | 'ink' | 'moss')}
            >
              <span
                className="settings-swatch-dot"
                style={{ background: opt.cssVar }}
              />
              <span className="settings-swatch-label">{opt.label}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="settings-section">
        <h2>Journal ink color</h2>
        <p className="settings-section-hint">
          Used for your annotations' left border. In dark mode, annotation text
          always renders in a readable off-white regardless of this color — this
          only affects light mode and the card border.
        </p>
        <div className="settings-swatch-row">
          {JOURNAL_COLOR_PRESETS.map((preset) => (
            <button
              key={preset.hex}
              type="button"
              className={`settings-swatch${journalColor === preset.hex ? ' is-selected' : ''}`}
              onClick={() => setJournalColor(preset.hex)}
            >
              <span className="settings-swatch-dot" style={{ background: preset.hex }} />
              <span className="settings-swatch-label">{preset.label}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="settings-section">
        <h2>Journal handwriting</h2>
        <p className="settings-section-hint">Font used for your annotations.</p>
        <div className="settings-font-list">
          {Object.entries(JOURNAL_FONT_OPTIONS).map(([key, fontFamily]) => (
            <button
              key={key}
              type="button"
              className={`settings-font-option${journalFont === key ? ' is-selected' : ''}`}
              style={{ fontFamily }}
              onClick={() => setJournalFont(key)}
            >
              this is what your notes will look like
              {journalFont === key && <span className="settings-font-option-check">✓</span>}
            </button>
          ))}
        </div>
      </div>

      <div className="settings-save-row">
        <button
          type="button"
          className="settings-save-button"
          onClick={save}
          disabled={saving}
        >
          {saving ? 'Saving…' : 'Save'}
        </button>
        {saved && <span className="settings-save-status">Saved.</span>}
        {error && <span className="settings-error">{error}</span>}
      </div>
    </div>
  );
}
