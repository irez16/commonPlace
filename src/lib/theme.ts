export type ThemePreference = 'system' | 'light' | 'dark';

const STORAGE_KEY = 'commonplace-theme';

export function getStoredTheme(): ThemePreference {
  const stored = localStorage.getItem(STORAGE_KEY);
  return stored === 'light' || stored === 'dark' ? stored : 'system';
}

function applyTheme(theme: ThemePreference) {
  // 'system' means no override — index.css's @media(prefers-color-scheme)
  // rules take it from there. Only 'light'/'dark' get the explicit
  // data-theme attribute that forces one or the other.
  if (theme === 'system') {
    delete document.documentElement.dataset.theme;
  } else {
    document.documentElement.dataset.theme = theme;
  }
}

export function setStoredTheme(theme: ThemePreference) {
  if (theme === 'system') {
    localStorage.removeItem(STORAGE_KEY);
  } else {
    localStorage.setItem(STORAGE_KEY, theme);
  }
  applyTheme(theme);
}

// Called once at app startup (before the first React render) so a saved
// preference applies immediately rather than flashing the system default
// first. This is a device-local preference (localStorage), not synced to
// the account/DB — same theme choice won't follow you to another device.
export function initTheme() {
  applyTheme(getStoredTheme());
}
