import { useEffect, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { thumbnailQueue } from '../../lib/thumbnailQueue';

interface ThumbnailProps {
  /** The stored picture (090); without it the card draws one. */
  storedUrl: string | null | undefined;
  /** Draws the picture (lazy renderers); called only once the card is near the screen, one card at a time. */
  render: (signal: AbortSignal) => Promise<Blob>;
  /** Alt text. */
  alt: string;
  /** The section's icon, shown while drawing and when the picture cannot be made. */
  fallback: ReactNode;
  /** The drawn picture, e.g. to store it when the viewer owns the item (backfill). */
  onRendered?: (blob: Blob) => void;
}

/** How far outside the screen a card starts drawing. */
const ROOT_MARGIN = '200px';

/**
 * The picture of a weapon or animation card (090, Q2 = C): the stored one when there is one, else drawn in the
 * browser — only once the card comes near the screen, through the page-wide queue (one at a time), cancelled if the
 * card goes away first. A failure shows the section's icon, never an error.
 */
export const Thumbnail = ({ storedUrl, render, alt, fallback, onRendered }: ThumbnailProps) => {
  const holder = useRef<HTMLSpanElement | null>(null);
  const [drawn, setDrawn] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);
  const renderRef = useRef(render);
  renderRef.current = render;
  const renderedRef = useRef(onRendered);
  renderedRef.current = onRendered;

  useEffect(() => {
    if (storedUrl || failed) return undefined;
    const element = holder.current;
    if (!element) return undefined;
    let cancel: (() => void) | null = null;
    let url: string | null = null;
    let done = false;
    const start = () => {
      if (cancel || done) return;
      const ticket = thumbnailQueue.enqueue((signal) => renderRef.current(signal));
      cancel = ticket.cancel;
      ticket.promise
        .then((blob) => {
          done = true;
          url = URL.createObjectURL(blob);
          setDrawn(url);
          renderedRef.current?.(blob);
        })
        .catch(() => {
          // A cancelled job (the card left the screen) may start again; a real failure keeps the icon.
          if (cancel === null) return;
          if (!done) setFailed(true);
        });
    };
    const observer = typeof IntersectionObserver === 'undefined'
      ? null
      : new IntersectionObserver((entries) => {
        if (entries.some((entry) => entry.isIntersecting)) start();
        else if (cancel && !done) {
          const stop = cancel;
          cancel = null;
          stop();
        }
      }, { rootMargin: ROOT_MARGIN });
    if (observer) observer.observe(element);
    else start();
    return () => {
      observer?.disconnect();
      if (cancel && !done) {
        const stop = cancel;
        cancel = null;
        stop();
      }
      if (url) URL.revokeObjectURL(url);
    };
  }, [storedUrl, failed]);

  const source = storedUrl || drawn;
  if (source && !failed) {
    return <img src={source} alt={alt} loading="lazy" onError={() => { if (source === storedUrl) setFailed(true); }} />;
  }
  return <span ref={holder} className="stm-library-card-fallback" aria-hidden="true">{fallback}</span>;
};

export default Thumbnail;
