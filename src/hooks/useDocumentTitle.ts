import { useEffect } from 'react';

// Sets the browser tab title for the page it's called from, restoring
// the previous title on unmount. This only affects the tab title, not
// link previews on social/messaging apps — those need meta tags
// present in the raw HTML before any JS runs, which a client-only SPA
// can't provide without server-side rendering or prerendering.
export function useDocumentTitle(title: string | null | undefined) {
  useEffect(() => {
    const previous = document.title;
    document.title = title ? `${title} · commonplace` : 'commonplace';
    return () => {
      document.title = previous;
    };
  }, [title]);
}
