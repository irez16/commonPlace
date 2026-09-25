import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient';
import { useFollowCounts } from '../hooks/useFollowCounts';
import { resolveLedgerAccent } from '../lib/ledgerAccent';
import FollowButton from './FollowButton';
import Avatar from './Avatar';
import type { Profile } from '../types';
import './ProfileHeader.css';

interface ProfileHeaderProps {
  profile: Profile;
  isOwnProfile: boolean;
  viewerId: string | null;
  onProfileUpdated: (updated: Profile) => void;
}

interface EditDraft {
  name: string;
  currently: string;
  bio: string;
}

export default function ProfileHeader({
  profile,
  isOwnProfile,
  viewerId,
  onProfileUpdated,
}: ProfileHeaderProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [draft, setDraft] = useState<EditDraft | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // 'copied' shows "Link copied" briefly after the clipboard fallback;
  // 'manual' means sharing and copying both failed, so the URL is shown
  // as selectable text instead.
  const [shareState, setShareState] = useState<'idle' | 'copied' | 'manual'>('idle');
  const copiedTimer = useRef<number | undefined>(undefined);
  useEffect(() => () => window.clearTimeout(copiedTimer.current), []);
  const profileUrl = `${window.location.origin}/@${profile.username}`;

  const shareProfile = async () => {
    if (navigator.share) {
      try {
        await navigator.share({ title: `${profile.name} on CommonPlace`, url: profileUrl });
        return;
      } catch (err) {
        // Dismissing the share sheet isn't a failure.
        if (err instanceof DOMException && err.name === 'AbortError') return;
        // Anything else (e.g. share not allowed here): fall through to copy.
      }
    }

    try {
      await navigator.clipboard.writeText(profileUrl);
      setShareState('copied');
      window.clearTimeout(copiedTimer.current);
      copiedTimer.current = window.setTimeout(() => setShareState('idle'), 2000);
    } catch {
      setShareState('manual');
    }
  };

  const shareButton = (
    <button type="button" className="profile-header-button hit-area" onClick={shareProfile}>
      {shareState === 'copied' ? 'Link copied' : 'Share profile'}
    </button>
  );
  const manualShareUrl = shareState === 'manual' && (
    <p className="profile-header-share-url">{profileUrl}</p>
  );

  const { loading: countsLoading, followerCount, followingCount } = useFollowCounts(
    isOwnProfile ? profile.id : undefined
  );

  const startEdit = () => {
    setDraft({
      name: profile.name,
      currently: profile.currently || '',
      bio: profile.bio || '',
    });
    setIsEditing(true);
    setError(null);
  };

  const cancelEdit = () => {
    setIsEditing(false);
    setDraft(null);
    setError(null);
  };

  const saveEdit = async () => {
    if (!draft) return;

    if (!draft.name.trim()) {
      setError('Name is required.');
      return;
    }

    setSaving(true);
    setError(null);

    // Update goes against the underlying `profiles` table, not the
    // `public_profiles` view — views aren't directly writable.
    const { data, error: updateError } = await supabase
      .from('profiles')
      .update({
        name: draft.name.trim(),
        currently: draft.currently.trim() || null,
        bio: draft.bio.trim() || null,
      })
      .eq('id', profile.id)
      .select()
      .single();

    setSaving(false);

    if (updateError) {
      setError(updateError.message);
      return;
    }

    onProfileUpdated({ ...profile, ...(data as Profile) });
    setIsEditing(false);
    setDraft(null);
  };

  if (isEditing && draft) {
    return (
      <div className="profile-header-form">
        <label>
          Name
          <input
            type="text"
            value={draft.name}
            onChange={(e) => setDraft((d) => d && { ...d, name: e.target.value })}
          />
        </label>
        <p className="profile-header-username">@{profile.username}</p>
        <label>
          Currently
          <input
            type="text"
            value={draft.currently}
            onChange={(e) => setDraft((d) => d && { ...d, currently: e.target.value })}
            placeholder="What are you reading/watching right now?"
          />
        </label>
        <label>
          Bio
          <textarea
            value={draft.bio}
            onChange={(e) => setDraft((d) => d && { ...d, bio: e.target.value })}
            rows={3}
          />
        </label>
        {error && <p className="profile-header-error">{error}</p>}
        <div className="profile-header-form-actions">
          <button
            type="button"
            className="profile-header-button hit-area"
            onClick={saveEdit}
            disabled={saving}
          >
            {saving ? 'Saving…' : 'Save'}
          </button>
          <button
            type="button"
            className="profile-header-button hit-area"
            onClick={cancelEdit}
            disabled={saving}
          >
            Cancel
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="profile-header">
      <Avatar
        name={profile.name}
        url={profile.avatar_url}
        accentColor={resolveLedgerAccent(profile.ledger_accent)}
        size={56}
      />
      <div className="profile-header-text">
        <h1 className="profile-header-name">{profile.name}</h1>
        <p className="profile-header-username">@{profile.username}</p>
        {profile.currently && (
          <p className="profile-header-currently">
            <span className="profile-header-currently-label">Currently</span>
            {profile.currently}
          </p>
        )}
        {profile.bio && <p className="profile-header-bio">{profile.bio}</p>}
        {isOwnProfile ? (
          <>
            <div className="profile-header-counts">
              <Link className="hit-area" to="/following">
                Following{!countsLoading && ` (${followingCount})`}
            </Link>
            <span>·</span>
            <Link className="hit-area" to="/followers">
              Followers{!countsLoading && ` (${followerCount})`}
            </Link>
          </div>
          <div className="profile-header-actions">
            <button type="button" className="profile-header-button hit-area" onClick={startEdit}>
              Edit profile
            </button>
            {shareButton}
          </div>
          {manualShareUrl}
        </>
      ) : (
        <div className="profile-header-actions">
          <FollowButton viewerId={viewerId} targetUserId={profile.id} />
          {shareButton}
        </div>
      )}
      {!isOwnProfile && manualShareUrl}
      </div>
    </div>
  );
}
