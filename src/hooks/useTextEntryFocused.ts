import { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';

// Fields that bring up the on-screen keyboard (or, for <select>, the
// picker) on a phone.
function isTextEntry(el: EventTarget | null): boolean {
  if (!(el instanceof HTMLElement)) return false;
  if (el.isContentEditable) return true;
  if (el instanceof HTMLTextAreaElement || el instanceof HTMLSelectElement) return true;
  if (el instanceof HTMLInputElement) {
    return !['button', 'checkbox', 'color', 'file', 'hidden', 'image', 'radio', 'range', 'reset', 'submit'].includes(el.type);
  }
  return false;
}

// True while a text field is focused on a touch device, i.e. while the
// on-screen keyboard is (or is about to be) up. Used to get fixed bottom
// chrome out of the way so it can't cover the field being typed in.
// Always false with a mouse/trackpad, where there's no on-screen keyboard.
//
// The focused field is kept in state and re-checked on every render (and
// on navigation and viewport resizes), because a field that is removed
// from the page while focused, e.g. by navigating away from a search box,
// never fires focusout. Without that re-check the tab bar could stay
// hidden.
export function useTextEntryFocused(): boolean {
  const [field, setField] = useState<HTMLElement | null>(null);
  const [, setTick] = useState(0);
  // Re-render on navigation so a field left behind on the old page stops
  // counting.
  useLocation();

  useEffect(() => {
    const coarse = window.matchMedia('(pointer: coarse)');

    const onFocusIn = (e: FocusEvent) => {
      if (coarse.matches && isTextEntry(e.target)) setField(e.target as HTMLElement);
    };
    // Moving straight from one field to the next keeps it hidden (no
    // flicker); anything else, including the keyboard's Done button
    // blurring the field, brings the chrome back.
    const onFocusOut = (e: FocusEvent) => {
      if (!isTextEntry(e.relatedTarget)) setField(null);
    };
    // The keyboard closing resizes the visual viewport.
    const onViewportResize = () => setTick((t) => t + 1);

    document.addEventListener('focusin', onFocusIn);
    document.addEventListener('focusout', onFocusOut);
    window.visualViewport?.addEventListener('resize', onViewportResize);
    return () => {
      document.removeEventListener('focusin', onFocusIn);
      document.removeEventListener('focusout', onFocusOut);
      window.visualViewport?.removeEventListener('resize', onViewportResize);
    };
  }, []);

  return field !== null && field.isConnected && document.activeElement === field;
}
