import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient';
import { useProfileStatus } from '../hooks/useProfileStatus';
import { usePublicProfile } from '../hooks/usePublicProfile';
import { getStoredTheme, setStoredTheme, type ThemePreference } from '../lib/theme';
import { LEDGER_ACCENT_OPTIONS } from '../lib/ledgerAccent';
import { JOURNAL_COLOR_PRESETS } from '../lib/journalColors';
import { JOURNAL_FONT_OPTIONS, resolveJournalFont } from '../lib/journalFonts';
import type { Profile } from '../types';
import './SettingsPage.css';

type SaveStatus = 'idle' | 'saving' | 'saved' | 'error';

// Own-account settings. Everything here auto-saves on change — no Save
// button — since these are all single-value toggles/pickers rather than
// free-text fields where you'd want a chance to review before committing.
export default function SettingsPage() {
  const { username } = useProfileStatus();
  const { loading, profile: fetchedProfile } = usePublicProfile(username);

  const [profile, setProfile] = useState<Profile | null>(null);
  const [status, setStatus] = useState<SaveStatus>('idle');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [theme, setTheme] = useState<ThemePreference>('system');

  useEffect(() => {
    if (fetchedProfile) setProfile(fetchedProfile);
  }, [fetchedProfile]);

  useEffect(() => {
    setTheme(getStoredTheme());
  }, []);

  if (!username) {
    return (
      <div className="settings-page">
        <p>You need to be signed in to view settings.</p>
      </div>
    );
  }

  if (loading || !profile) return <div className="settings-page">Loading…</div>;

  const saveField = async (patch: Partial<Profile>) => {
    // Optimistic — the UI reflects the choice immediately rather than
    // waiting on the network round-trip, since these are simple enum/
    // color values with little room for the save to meaningfully fail.
    setProfile((p) => (p ? { ...p, ...patch } : p));
    setStatus('saving');
    setErrorMessage(null);

    const { error } = await supabase.from('profiles').update(patch).eq('id', profile.id);

    if (error) {
      setStatus('error');
      setErrorMessage(error.message);
      return;
    }

    setStatus('saved');
  };

  const setThemePreference = (next: ThemePreference) => {
    setTheme(next);
    setStoredTheme(next);
  };

  return (
    <div className="settings-page">
      <Link className="settings-page-breadcrumb" to={`/@${username}`}>
        ← @{username}
      </Link>
      <h1>Settings</h1>

      <div className="settings-section">
        <h2>Appearance</h2>
        <p className="settings-section-hint">
          Saved on this device only — won't follow you to another device or browser.
        </p>
        <div className="settings-toggle-row">
          {(['system', 'light', 'dark'] as ThemePreference[]).map((option) => (
            <button
              key={option}
              type="button"
              className={`settings-toggle${theme === option ? ' is-selected' : ''}`}
              onClick={() => setThemePreference(option)}
            >
              {option === 'system' ? 'System' : option === 'light' ? 'Light' : 'Dark'}
            </button>
          ))}
        </div>
      </div>

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
              className={`settings-swatch${profile.ledger_accent === key ? ' is-selected' : ''}`}
              onClick={() => saveField({ ledger_accent: key as Profile['ledger_accent'] })}
            >
              <span className="settings-swatch-dot" style={{ background: opt.cssVar }} />
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
              className={`settings-swatch${profile.journal_cover_color === preset.hex ? ' is-selected' : ''}`}
              onClick={() => saveField({ journal_cover_color: preset.hex })}
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
        <select
          className="settings-font-select"
          value={profile.journal_font ?? 'caveat'}
          onChange={(e) => saveField({ journal_font: e.target.value })}
        >
          {Object.keys(JOURNAL_FONT_OPTIONS).map((key) => (
            <option key={key} value={key}>
              {key
                .split('-')
                .map((w) => w[0].toUpperCase() + w.slice(1))
                .join(' ')}
            </option>
          ))}
        </select>
        <p
          className="settings-font-preview"
          style={{ fontFamily: resolveJournalFont(profile.journal_font) }}
        >
          this is what your notes will look like
        </p>
      </div>

      <div className="settings-save-row">
        {status === 'saving' && <span className="settings-save-status">Saving…</span>}
        {status === 'saved' && <span className="settings-save-status">Saved.</span>}
        {status === 'error' && <span className="settings-error">{errorMessage}</span>}
      </div>
    </div>
  );
}
