import { useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient';
import { useFollowCounts } from '../hooks/useFollowCounts';
import FollowButton from './FollowButton';
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
  const { loading: countsLoading, followerCount, followingCount } = useFollowCounts(
    isOwnProfile ? profile.id : undefined
  );

  const handleLogout = async () => {
    await supabase.auth.signOut();
    window.location.reload();
  };

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
            className="profile-header-button"
            onClick={saveEdit}
            disabled={saving}
          >
            {saving ? 'Saving…' : 'Save'}
          </button>
          <button
            type="button"
            className="profile-header-button"
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
            <Link to="/following">
              Following{!countsLoading && ` (${followingCount})`}
            </Link>
            <span>·</span>
            <Link to="/followers">
              Followers{!countsLoading && ` (${followerCount})`}
            </Link>
          </div>
          <div className="profile-header-actions">
            <button type="button" className="profile-header-button" onClick={startEdit}>
              Edit profile
            </button>
            <button type="button" className="profile-header-button" onClick={handleLogout}>
              Log out
            </button>
          </div>
        </>
      ) : (
        <div className="profile-header-actions">
          <FollowButton viewerId={viewerId} targetUserId={profile.id} />
        </div>
      )}
    </div>
  );
}
