import { useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient';
import FollowButton from './FollowButton';
import type { Profile } from '../types';

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
      <div>
        <label>
          Name
          <input
            type="text"
            value={draft.name}
            onChange={(e) => setDraft((d) => d && { ...d, name: e.target.value })}
          />
        </label>
        <p>@{profile.username}</p>
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
        {error && <p style={{ color: 'crimson' }}>{error}</p>}
        <button type="button" onClick={saveEdit} disabled={saving}>
          {saving ? 'Saving…' : 'Save'}
        </button>
        <button type="button" onClick={cancelEdit} disabled={saving}>
          Cancel
        </button>
      </div>
    );
  }

  return (
    <div>
      <h1>{profile.name}</h1>
      <p>@{profile.username}</p>
      {profile.currently && <p>Currently: {profile.currently}</p>}
      {profile.bio && <p>{profile.bio}</p>}
      {isOwnProfile ? (
        <div>
          <button type="button" onClick={startEdit}>
            Edit profile
          </button>
          <Link to="/">Go to dashboard</Link>
        </div>
      ) : (
        <FollowButton viewerId={viewerId} targetUserId={profile.id} />
      )}
    </div>
  );
}
