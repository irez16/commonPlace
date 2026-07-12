import { useEffect, useState } from 'react';
import type { FormEvent } from 'react';
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

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordStatus, setPasswordStatus] = useState<SaveStatus>('idle');
  const [passwordError, setPasswordError] = useState<string | null>(null);

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

  const handleLogout = async () => {
    await supabase.auth.signOut();
    window.location.href = '/';
  };

  const changePassword = async (e: FormEvent) => {
    e.preventDefault();
    setPasswordError(null);

    if (newPassword.length < 6) {
      setPasswordError('New password must be at least 6 characters.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordError("New passwords don't match.");
      return;
    }

    setPasswordStatus('saving');

    // Re-verify the current password before allowing the change, even
    // though the active session alone would technically let Supabase
    // accept the update — this is the safety check that stops someone
    // at an already-unlocked device from silently taking over the
    // account. signInWithPassword also just refreshes the session, so
    // this is harmless if it succeeds.
    const { data: userData } = await supabase.auth.getUser();
    const email = userData.user?.email;

    if (!email) {
      setPasswordStatus('error');
      setPasswordError("Couldn't verify your account email — try logging in again.");
      return;
    }

    const { error: verifyError } = await supabase.auth.signInWithPassword({
      email,
      password: currentPassword,
    });

    if (verifyError) {
      setPasswordStatus('error');
      setPasswordError('Current password is incorrect.');
      return;
    }

    const { error: updateError } = await supabase.auth.updateUser({ password: newPassword });

    if (updateError) {
      setPasswordStatus('error');
      setPasswordError(updateError.message);
      return;
    }

    setPasswordStatus('saved');
    setCurrentPassword('');
    setNewPassword('');
    setConfirmPassword('');
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

      <div className="settings-section">
        <h2>Change password</h2>
        <form className="settings-password-form" onSubmit={changePassword}>
          <input
            type="password"
            placeholder="Current password"
            value={currentPassword}
            onChange={(e) => setCurrentPassword(e.target.value)}
            required
          />
          <input
            type="password"
            placeholder="New password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            required
          />
          <input
            type="password"
            placeholder="Confirm new password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            required
          />
          <div className="settings-save-row">
            <button
              type="submit"
              className="settings-toggle"
              disabled={passwordStatus === 'saving'}
            >
              {passwordStatus === 'saving' ? 'Updating…' : 'Update password'}
            </button>
            {passwordStatus === 'saved' && (
              <span className="settings-save-status">Password updated.</span>
            )}
            {passwordStatus === 'error' && (
              <span className="settings-error">{passwordError}</span>
            )}
          </div>
        </form>
      </div>

      <div className="settings-section">
        <button type="button" className="settings-logout-button" onClick={handleLogout}>
          Log out
        </button>
      </div>
    </div>
  );
}
