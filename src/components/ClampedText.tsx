import { useEffect, useRef, useState, type ReactNode } from 'react';
import './ClampedText.css';

interface ClampedTextProps {
  className: string;
  text: string;
  // Rendered below the text only when it's actually cut off, e.g. a
  // "Read more" link to the full view.
  more: ReactNode;
}

// A paragraph clamped to a few lines (the line count lives in the
// caller's CSS as --clamp-lines), that shows `more` only when the text
// really overflows. Measured with a ResizeObserver, so it stays right
// when the width changes (rotation, font load).
export default function ClampedText({ className, text, more }: ClampedTextProps) {
  const ref = useRef<HTMLParagraphElement>(null);
  const [clamped, setClamped] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el || typeof ResizeObserver === 'undefined') return;
    const observer = new ResizeObserver(() => {
      setClamped(el.scrollHeight > el.clientHeight + 1);
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, [text]);

  return (
    <>
      <p ref={ref} className={`${className} clamped-text${clamped ? ' is-clamped' : ''}`}>
        {text}
      </p>
      {clamped && more}
    </>
  );
}
