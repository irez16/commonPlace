import './Avatar.css';

interface AvatarProps {
  name: string;
  url?: string | null;
  accentColor: string;
  size?: number;
}

function initials(name: string): string {
  return name.trim().charAt(0).toUpperCase() || '?';
}

// Shows the uploaded avatar image if there is one, otherwise falls back
// to a colored circle with the person's first initial — same fallback
// used in the Feed before real avatars existed, now shared here so
// every place an avatar shows up (Feed, profile header, Settings
// preview) stays consistent and switches to real images automatically
// once someone uploads one.
export default function Avatar({ name, url, accentColor, size = 38 }: AvatarProps) {
  const style = { width: size, height: size, fontSize: size * 0.42 };

  if (url) {
    return (
      <img
        className="avatar-img"
        style={style}
        src={url}
        alt={name}
      />
    );
  }

  return (
    <span className="avatar-initials" style={{ ...style, background: accentColor }}>
      {initials(name)}
    </span>
  );
}
