import { useState } from 'react';
import { useTextEntryFocused } from '../hooks/useTextEntryFocused';
import './IosInstallHint.css';

// Remembered per device once dismissed. Listed in the privacy policy's
// local storage disclosure (LegalPage).
const DISMISSED_KEY = 'commonplace-ios-install-hint-dismissed';

function isDismissed(): boolean {
  try {
    return window.localStorage.getItem(DISMISSED_KEY) === '1';
  } catch {
    return false;
  }
}

// Safari on iPhone/iPad only: other iOS browsers (Chrome, Firefox, Edge,
// Opera, the Google app) put Add to Home Screen somewhere else, or not at
// all. iPadOS reports a desktop Mac user agent by default, so a Mac UA
// with a touch screen counts as an iPad.
function isIosSafari(): boolean {
  const ua = navigator.userAgent;
  const iosDevice = /iPhone|iPad|iPod/.test(ua);
  const iPadDesktopUa = /Macintosh/.test(ua) && navigator.maxTouchPoints > 1;
  if (!iosDevice && !iPadDesktopUa) return false;
  if (/CriOS|FxiOS|EdgiOS|OPiOS|GSA\//.test(ua)) return false;
  // In-app browsers (web views) don't carry the Safari token.
  return /Safari\//.test(ua);
}

function isStandalone(): boolean {
  const nav = navigator as Navigator & { standalone?: boolean };
  return nav.standalone === true || window.matchMedia('(display-mode: standalone)').matches;
}

function shouldShow(): boolean {
  if (typeof window === 'undefined') return false;
  return isIosSafari() && !isStandalone() && !isDismissed();
}

interface IosInstallHintProps {
  // true on the login screen, where there's no tab bar to sit above: the
  // card pins itself to the bottom of the screen instead.
  floating?: boolean;
}

// One small, dismissible card telling iOS Safari visitors how to install
// the app. iOS has no install prompt, so without this most people never
// find Add to Home Screen.
export default function IosInstallHint({ floating = false }: IosInstallHintProps) {
  const [visible, setVisible] = useState(shouldShow);
  // Above the tab bar, TabBar hides the whole dock while typing; floating,
  // the card gets out of the keyboard's way itself.
  const typing = useTextEntryFocused();

  if (!visible || (floating && typing)) return null;

  const dismiss = () => {
    setVisible(false);
    try {
      window.localStorage.setItem(DISMISSED_KEY, '1');
    } catch {
      // Storage blocked (e.g. private mode): hidden for this visit only.
    }
  };

  return (
    <aside
      className={`ios-install-hint${floating ? ' is-floating' : ''}`}
      aria-label="Install CommonPlace"
    >
      <p className="ios-install-hint-text">
        Get CommonPlace on your home screen: tap Share
        <svg className="ios-install-hint-share" width="15" height="18" viewBox="0 0 15 18" aria-hidden="true">
          <path
            d="M7.5 1v10.5M4 4.5 7.5 1 11 4.5M5 7.5H2.25a.75.75 0 0 0-.75.75v8a.75.75 0 0 0 .75.75h10.5a.75.75 0 0 0 .75-.75v-8a.75.75 0 0 0-.75-.75H10"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
        , then Add to Home Screen.
      </p>
      <button type="button" className="ios-install-hint-close" onClick={dismiss} aria-label="Dismiss">
        <svg width="14" height="14" viewBox="0 0 14 14" aria-hidden="true">
          <path d="M2 2l10 10M12 2 2 12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
        </svg>
      </button>
    </aside>
  );
}
