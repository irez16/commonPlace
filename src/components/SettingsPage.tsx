import { useEffect, useState } from 'react';
import type { FormEvent, ChangeEvent, CSSProperties } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient';
import { useProfileStatus } from '../hooks/useProfileStatus';
import { useDocumentTitle } from '../hooks/useDocumentTitle';
import { usePublicProfile } from '../hooks/usePublicProfile';
import { getStoredTheme, setStoredTheme, type ThemePreference } from '../lib/theme';
import { LEDGER_ACCENT_OPTIONS, resolveLedgerAccent } from '../lib/ledgerAccent';
import { JOURNAL_COLOR_PRESETS } from '../lib/journalColors';
import { JOURNAL_FONT_OPTIONS, resolveJournalFont } from '../lib/journalFonts';
import Avatar from './Avatar';
import type { Profile } from '../types';
import './AppForm.css';
import './SettingsPage.css';

type SaveStatus = 'idle' | 'saving' | 'saved' | 'error';

// Own-account settings. Everything here auto-saves on change — no Save
// button — since these are all single-value toggles/pickers rather than
// free-text fields where you'd want a chance to review before committing.
export default function SettingsPage() {
  useDocumentTitle('Settings');
  const { username } = useProfileStatus();
  const { loading, profile: fetchedProfile } = usePublicProfile(username);

  const [profile, setProfile] = useState<Profile | null>(null);
  const [status, setStatus] = useState<SaveStatus>('idle');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [theme, setTheme] = useState<ThemePreference>('system');

  const [avatarUploading, setAvatarUploading] = useState(false);
  const [avatarError, setAvatarError] = useState<string | null>(null);

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
    // waiting on the network round-trip.
    setProfile((p) => (p ? { ...p, ...patch } : p));
    setStatus('saving');
    setErrorMessage(null);

    const { data, error } = await supabase
      .from('profiles')
      .update(patch)
      .eq('id', profile.id)
      .select()
      .single();

    if (error) {
      setStatus('error');
      setErrorMessage(error.message);
      return;
    }

    // Trust what the server actually stored, not just the optimistic
    // guess — if something (a constraint, a stale RLS rule, whatever)
    // silently rejected part of the write, this is where it'd show up
    // as the UI snapping back rather than looking like it saved.
    setProfile(data as Profile);
    setStatus('saved');
  };

  const handleAvatarChange = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = ''; // allow re-selecting the same file later
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setAvatarError('Please choose an image file.');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setAvatarError('Image must be under 5MB.');
      return;
    }

    setAvatarError(null);
    setAvatarUploading(true);

    // Fixed filename per user (not per upload) with upsert, so re-
    // uploading replaces the old file rather than accumulating orphans
    // in storage.
    const ext = file.name.split('.').pop()?.toLowerCase() || 'jpg';
    const path = `${profile.id}/avatar.${ext}`;

    const { error: uploadError } = await supabase.storage
      .from('avatars')
      .upload(path, file, { upsert: true, cacheControl: '3600' });

    if (uploadError) {
      setAvatarUploading(false);
      setAvatarError(uploadError.message);
      return;
    }

    const { data: urlData } = supabase.storage.from('avatars').getPublicUrl(path);
    // Cache-bust: the path is stable (upsert overwrites it), so without
    // this the browser/CDN can keep showing the old cached image at
    // the same URL right after a re-upload.
    const avatarUrl = `${urlData.publicUrl}?t=${Date.now()}`;

    await saveField({ avatar_url: avatarUrl });
    setAvatarUploading(false);
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
      setPasswordError("Couldn't verify your account email, try logging in again.");
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
        <h2>Avatar</h2>
        <div className="settings-avatar-row">
          <Avatar
            name={profile.name}
            url={profile.avatar_url}
            accentColor={resolveLedgerAccent(profile.ledger_accent)}
            size={64}
          />
          <label className="app-form-secondary-button settings-avatar-upload-label">
            {avatarUploading ? 'Uploading…' : 'Upload photo'}
            <input
              type="file"
              accept="image/*"
              onChange={handleAvatarChange}
              disabled={avatarUploading}
              style={{ display: 'none' }}
            />
          </label>
        </div>
        {avatarError && <p className="app-form-error">{avatarError}</p>}
      </div>

      <div className="settings-section">
        <h2>Appearance</h2>
        <p className="settings-section-hint">
          Saved on this device only, so it won't follow you to another device or browser.
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
              style={{ '--swatch-ring-color': opt.cssVar } as CSSProperties & Record<string, string>}
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
          Defaults to your Ledger accent above. Pick a color here only if you want your
          Journal to look different from your Ledger. In dark mode, annotation text always
          renders in a readable off-white regardless of this color. This only affects
          light mode and the card border.
        </p>
        <div className="settings-swatch-row">
          <button
            type="button"
            className={`settings-swatch${!profile.journal_cover_color ? ' is-selected' : ''}`}
            style={
              {
                '--swatch-ring-color': resolveLedgerAccent(profile.ledger_accent),
              } as CSSProperties & Record<string, string>
            }
            onClick={() => saveField({ journal_cover_color: null })}
          >
            <span
              className="settings-swatch-dot settings-swatch-dot-none"
              style={{ background: resolveLedgerAccent(profile.ledger_accent) }}
            />
            <span className="settings-swatch-label">Match Ledger</span>
          </button>
          {JOURNAL_COLOR_PRESETS.map((preset) => (
            <button
              key={preset.hex}
              type="button"
              className={`settings-swatch${profile.journal_cover_color === preset.hex ? ' is-selected' : ''}`}
              style={{ '--swatch-ring-color': preset.hex } as CSSProperties & Record<string, string>}
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
        <Link className="settings-legal-link" to="/legal">
          Terms & Privacy
        </Link>
      </div>
    </div>
  );
}
