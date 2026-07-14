import { useEffect, useRef, useState, forwardRef, useImperativeHandle } from 'react';

const HCAPTCHA_SITE_KEY = import.meta.env.VITE_HCAPTCHA_SITE_KEY as string | undefined;

declare global {
  interface Window {
    hcaptcha?: {
      render: (container: HTMLElement, options: Record<string, unknown>) => string;
      reset: (widgetId: string) => void;
    };
  }
}

export interface CaptchaHandle {
  reset: () => void;
}

interface CaptchaProps {
  onToken: (token: string | null) => void;
}

// hCaptcha widget, wired to feed Supabase's captchaToken option on
// signUp / signInWithPassword / resetPasswordForEmail. If Supabase's
// "Enable Captcha protection" setting isn't turned on, the token is
// simply ignored server-side — this component doesn't need to know
// whether protection is actually active.
//
// If VITE_HCAPTCHA_SITE_KEY isn't set, this renders nothing and every
// caller just submits without a token — harmless as long as captcha
// protection is also off in Supabase; if it's on with no site key
// configured here, submits will fail with a clear "captcha
// verification failed" error from Supabase, not a silent break.
const Captcha = forwardRef<CaptchaHandle, CaptchaProps>(({ onToken }, ref) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const widgetIdRef = useRef<string | null>(null);
  const [scriptReady, setScriptReady] = useState(!!window.hcaptcha);

  useEffect(() => {
    if (!HCAPTCHA_SITE_KEY) return;
    if (window.hcaptcha) {
      setScriptReady(true);
      return;
    }

    const existing = document.getElementById('hcaptcha-script');
    if (existing) {
      existing.addEventListener('load', () => setScriptReady(true));
      return;
    }

    const script = document.createElement('script');
    script.id = 'hcaptcha-script';
    script.src = 'https://js.hcaptcha.com/1/api.js?render=explicit';
    script.async = true;
    script.defer = true;
    script.onload = () => setScriptReady(true);
    document.head.appendChild(script);
  }, []);

  useEffect(() => {
    if (!scriptReady || !containerRef.current || !window.hcaptcha || !HCAPTCHA_SITE_KEY) return;
    if (widgetIdRef.current) return; // already rendered once

    widgetIdRef.current = window.hcaptcha.render(containerRef.current, {
      sitekey: HCAPTCHA_SITE_KEY,
      callback: (token: string) => onToken(token),
      'expired-callback': () => onToken(null),
      'error-callback': () => onToken(null),
    });
    // onToken is a fresh function each render from the caller, but the
    // widget itself should only ever be rendered once — re-running
    // this because onToken's identity changed would try to render a
    // second widget into the same container.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scriptReady]);

  useImperativeHandle(ref, () => ({
    // hCaptcha tokens are single-use and expire — call this after
    // every submit attempt (success or failure) so a retry has a
    // fresh token instead of reusing a dead one.
    reset: () => {
      if (window.hcaptcha && widgetIdRef.current !== null) {
        window.hcaptcha.reset(widgetIdRef.current);
      }
      onToken(null);
    },
  }));

  if (!HCAPTCHA_SITE_KEY) return null;

  return <div ref={containerRef} style={{ margin: '4px 0' }} />;
});

export default Captcha;
