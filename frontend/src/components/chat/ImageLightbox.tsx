import { useCallback, useEffect, useRef, useState } from 'react';
import type { PointerEvent as ReactPointerEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { Modal } from '../ui/Modal';
import { ArrowCounterclockwiseIcon, MinusIcon, PlusIcon } from '../ui/icons';
import {
  FITTED, IMAGE_ZOOM_MAX, IMAGE_ZOOM_MIN, clampPan, doubleScale, pinchScale, stepScale, wheelScale, zoomAt,
} from '../../lib/imageZoom';
import type { ImageView } from '../../lib/imageZoom';

interface ImageLightboxProps {
  image: { url: string; caption: string | null } | null;
  onClose: () => void;
}

/** A second tap within this time and distance is a double tap (touch has no reliable `dblclick`). */
const DOUBLE_TAP_MS = 300;
const DOUBLE_TAP_PX = 24;

interface Pinch {
  distance: number;
  scale: number;
}

/**
 * A chat photo (041) in the largest window, fitted whole; zoom with the wheel, a pinch, a double click/tap or the
 * "+"/"−" buttons, and drag to move around a zoomed picture (`lib/imageZoom`).
 */
export const ImageLightbox = ({ image, onClose }: ImageLightboxProps) => {
  const { t } = useTranslation();
  const alt = image?.caption ?? t('chat.image');
  return (
    <Modal open={image !== null} onOpenChange={(o) => { if (!o) onClose(); }} title={alt} wide
      className="stm-modal-image" bodyClassName="stm-lightbox-body">
      {image && <ZoomableImage key={image.url} url={image.url} alt={alt} />}
    </Modal>
  );
};

const ZoomableImage = ({ url, alt }: { url: string; alt: string }) => {
  const { t } = useTranslation();
  const stageRef = useRef<HTMLDivElement>(null);
  const imageRef = useRef<HTMLImageElement>(null);
  const [view, setView] = useState<ImageView>(FITTED);
  const viewRef = useRef(view);
  viewRef.current = view;
  const pointers = useRef(new Map<number, { x: number; y: number }>());
  const pinch = useRef<Pinch | null>(null);
  const lastTap = useRef<{ time: number; x: number; y: number } | null>(null);

  /** The window's size, the picture's fitted size and a screen point measured from the window's middle. */
  const measure = useCallback(() => {
    const rect = stageRef.current?.getBoundingClientRect();
    const stage = { width: rect?.width ?? 0, height: rect?.height ?? 0 };
    const fitted = { width: imageRef.current?.offsetWidth ?? 0, height: imageRef.current?.offsetHeight ?? 0 };
    const point = (clientX: number, clientY: number) => ({
      x: clientX - (rect ? rect.left + rect.width / 2 : 0),
      y: clientY - (rect ? rect.top + rect.height / 2 : 0),
    });
    return { stage, fitted, point };
  }, []);

  const zoomTo = useCallback((scale: number, clientX?: number, clientY?: number) => {
    const { stage, fitted, point } = measure();
    const at = clientX === undefined || clientY === undefined ? { x: 0, y: 0 } : point(clientX, clientY);
    setView((current) => zoomAt(current, scale, at, fitted, stage));
  }, [measure]);

  // The wheel needs a non-passive listener, or the page would scroll behind the window.
  useEffect(() => {
    const stage = stageRef.current;
    if (!stage) return undefined;
    const onWheel = (event: WheelEvent) => {
      event.preventDefault();
      zoomTo(wheelScale(viewRef.current.scale, event.deltaY), event.clientX, event.clientY);
    };
    stage.addEventListener('wheel', onWheel, { passive: false });
    return () => stage.removeEventListener('wheel', onWheel);
  }, [zoomTo]);

  const fingersApart = () => {
    const [a, b] = [...pointers.current.values()];
    return a && b ? Math.hypot(a.x - b.x, a.y - b.y) : 0;
  };

  const onPointerDown = (event: ReactPointerEvent<HTMLDivElement>) => {
    event.currentTarget.setPointerCapture(event.pointerId);
    pointers.current.set(event.pointerId, { x: event.clientX, y: event.clientY });
    if (pointers.current.size === 2) pinch.current = { distance: fingersApart(), scale: viewRef.current.scale };
  };

  const onPointerMove = (event: ReactPointerEvent<HTMLDivElement>) => {
    const previous = pointers.current.get(event.pointerId);
    if (!previous) return;
    pointers.current.set(event.pointerId, { x: event.clientX, y: event.clientY });
    if (pointers.current.size >= 2 && pinch.current) {
      const [a, b] = [...pointers.current.values()];
      zoomTo(pinchScale(pinch.current.scale, pinch.current.distance, fingersApart()), (a.x + b.x) / 2, (a.y + b.y) / 2);
    } else if (pointers.current.size === 1 && viewRef.current.scale > IMAGE_ZOOM_MIN) {
      const { stage, fitted } = measure();
      const dx = event.clientX - previous.x;
      const dy = event.clientY - previous.y;
      setView((current) => clampPan({ ...current, x: current.x + dx, y: current.y + dy }, fitted, stage));
    }
  };

  const onPointerUp = (event: ReactPointerEvent<HTMLDivElement>) => {
    pointers.current.delete(event.pointerId);
    if (pointers.current.size < 2) pinch.current = null;
    if (event.pointerType === 'mouse' || pointers.current.size > 0) return;
    const now = performance.now();
    const tap = lastTap.current;
    if (tap && now - tap.time < DOUBLE_TAP_MS && Math.hypot(event.clientX - tap.x, event.clientY - tap.y) < DOUBLE_TAP_PX) {
      lastTap.current = null;
      zoomTo(doubleScale(viewRef.current.scale), event.clientX, event.clientY);
    } else {
      lastTap.current = { time: now, x: event.clientX, y: event.clientY };
    }
  };

  const zoomed = view.scale > IMAGE_ZOOM_MIN;
  return (
    <div className="stm-lightbox">
      <div ref={stageRef} className={`stm-lightbox-stage${zoomed ? ' is-zoomed' : ''}`}
        onPointerDown={onPointerDown} onPointerMove={onPointerMove} onPointerUp={onPointerUp} onPointerCancel={onPointerUp}
        onDoubleClick={(e) => zoomTo(doubleScale(viewRef.current.scale), e.clientX, e.clientY)}>
        <img ref={imageRef} src={url} alt={alt} draggable={false}
          style={{ transform: `translate(${view.x}px, ${view.y}px) scale(${view.scale})` }} />
      </div>
      <div className="stm-lightbox-zoom btn-group btn-group-sm" role="group" aria-label={t('chat.imageZoom.label')}>
        <button type="button" className="btn btn-secondary" disabled={view.scale <= IMAGE_ZOOM_MIN}
          title={t('chat.imageZoom.out')} aria-label={t('chat.imageZoom.out')} onClick={() => zoomTo(stepScale(view.scale, -1))}>
          <MinusIcon size={16} />
        </button>
        <span className="btn btn-secondary disabled stm-lightbox-percent" aria-live="polite">{Math.round(view.scale * 100)}%</span>
        <button type="button" className="btn btn-secondary" disabled={view.scale >= IMAGE_ZOOM_MAX}
          title={t('chat.imageZoom.in')} aria-label={t('chat.imageZoom.in')} onClick={() => zoomTo(stepScale(view.scale, 1))}>
          <PlusIcon size={16} />
        </button>
        <button type="button" className="btn btn-secondary" disabled={!zoomed}
          title={t('chat.imageZoom.reset')} aria-label={t('chat.imageZoom.reset')} onClick={() => setView(FITTED)}>
          <ArrowCounterclockwiseIcon size={16} />
        </button>
      </div>
    </div>
  );
};

export default ImageLightbox;
