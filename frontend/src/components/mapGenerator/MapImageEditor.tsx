import { useCallback, useEffect, useRef, useState } from 'react';
import type { PointerEvent as ReactPointerEvent, WheelEvent as ReactWheelEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { Modal } from '../ui/Modal';
import { ConfirmModal } from '../ui/ConfirmModal';
import { ImageEditorToolbar } from './ImageEditorToolbar';
import type { EditorTool } from './ImageEditorToolbar';
import {
  EMPTY_HISTORY, MAX_SIZE, MIN_CROP, MIN_SIZE, StrokeLayer, applyOp, canRedo, canUndo, checkpointFor, clampRect, copyCanvas,
  foldFirst, isEmpty, overflow, pickColor, pushOp, redo, undo,
} from '../../lib/imageEdit';
import type { EditHistory, EditOp, Point, Rect } from '../../lib/imageEdit';
import type { GeneratorVersion } from '../../lib/mapGeneratorState';
import { base64Of } from '../../lib/mapGeneratorState';

export interface EditedImage {
  url: string;
  base64: string;
  mediaType: string;
}

interface MapImageEditorProps {
  /** The version being edited; null = closed. */
  version: GeneratorVersion | null;
  onApply: (image: EditedImage, from: number) => void;
  onClose: () => void;
  /** Whether there are edits not applied (the page's leave guard). */
  onDirtyChange?: (dirty: boolean) => void;
}

interface View {
  zoom: number;
  panX: number;
  panY: number;
}

type CropDrag = { kind: 'move' | 'new' | string; start: Point; rect: Rect } | null;

const HANDLE = 10;

const loadImage = (url: string): Promise<HTMLImageElement> => new Promise((resolve, reject) => {
  const image = new Image();
  image.onload = () => resolve(image);
  image.onerror = () => reject(new Error('load'));
  image.src = url;
});

/**
 * The map generator's image editor (100): brush (colour, eyedropper), clone (Q2 = B), crop (≥ 64, free or locked
 * ratio) and turns/flips (Q1 = A) on the version's real pixels; undo/redo replays the operation log from the nearest
 * checkpoint. "Aplicar" hands back a PNG that becomes a new version; nothing leaves the browser.
 */
export const MapImageEditor = ({ version, onApply, onClose, onDirtyChange }: MapImageEditorProps) => {
  const { t } = useTranslation();
  const open = version !== null;

  // The document: the folded base, checkpoints of the result every CHECKPOINT_EVERY ops, and the current result.
  const baseRef = useRef<HTMLCanvasElement | null>(null);
  const checkpoints = useRef(new Map<number, HTMLCanvasElement>());
  const docRef = useRef<HTMLCanvasElement | null>(null);
  const [history, setHistory] = useState<EditHistory>(EMPTY_HISTORY);
  const historyRef = useRef(history);
  historyRef.current = history;
  const [size, setSize] = useState<{ width: number; height: number } | null>(null);

  const displayRef = useRef<HTMLCanvasElement | null>(null);
  const areaRef = useRef<HTMLDivElement | null>(null);
  const [view, setView] = useState<View>({ zoom: 1, panX: 0, panY: 0 });

  const [tool, setTool] = useState<EditorTool>('brush');
  const [color, setColor] = useState('#6b5b45');
  const [picking, setPicking] = useState(false);
  const [brushSize, setBrushSize] = useState(30);
  const [opacity, setOpacity] = useState(1);
  const [originMode, setOriginMode] = useState(false);
  const [origin, setOrigin] = useState<Point | null>(null);
  const [cloneOffset, setCloneOffset] = useState<Point | null>(null);
  const [hover, setHover] = useState<Point | null>(null);
  const [crop, setCrop] = useState<Rect | null>(null);
  const [ratioLocked, setRatioLocked] = useState(false);
  const [confirming, setConfirming] = useState(false);

  const stroke = useRef<{ layer: StrokeLayer; op: Extract<EditOp, { kind: 'brush' | 'clone' }> } | null>(null);
  const cropDrag = useRef<CropDrag>(null);
  const pointers = useRef(new Map<number, Point>());
  const panning = useRef<{ start: Point; view: View; pinch: number | null } | null>(null);
  const spaceDown = useRef(false);

  // The page passes new callbacks on every render: read them through refs so the image is loaded only per version.
  const closeRef = useRef(onClose);
  closeRef.current = onClose;
  const loadFailedText = t('mapGenerator.editor.loadFailed');
  const loadFailedRef = useRef(loadFailedText);
  loadFailedRef.current = loadFailedText;

  const dirty = !isEmpty(history);
  useEffect(() => { onDirtyChange?.(open && dirty); }, [open, dirty, onDirtyChange]);

  /** Paints the document (and a stroke in progress) on the visible canvas. */
  const paint = useCallback(() => {
    const display = displayRef.current;
    const doc = docRef.current;
    if (!display || !doc) return;
    if (display.width !== doc.width || display.height !== doc.height) {
      display.width = doc.width;
      display.height = doc.height;
    }
    if (stroke.current) {
      stroke.current.layer.composeOnto(display);
      return;
    }
    const ctx = display.getContext('2d')!;
    ctx.clearRect(0, 0, display.width, display.height);
    ctx.drawImage(doc, 0, 0);
  }, []);

  const fit = useCallback((width: number, height: number) => {
    const area = areaRef.current;
    if (!area) return;
    const zoom = Math.min(area.clientWidth / width, area.clientHeight / height, 1) * 0.96;
    setView({ zoom, panX: (area.clientWidth - width * zoom) / 2, panY: (area.clientHeight - height * zoom) / 2 });
  }, []);

  const setDoc = useCallback((doc: HTMLCanvasElement) => {
    docRef.current = doc;
    setSize((prev) => (prev && prev.width === doc.width && prev.height === doc.height ? prev : { width: doc.width, height: doc.height }));
    paint();
  }, [paint]);

  // Opening: the version's pixels become the base; everything else starts over.
  useEffect(() => {
    if (!version) return;
    let cancelled = false;
    setHistory(EMPTY_HISTORY);
    checkpoints.current = new Map();
    setTool('brush');
    setOrigin(null);
    setCloneOffset(null);
    setCrop(null);
    setPicking(false);
    setOriginMode(false);
    loadImage(version.url).then((image) => {
      if (cancelled) return;
      const base = document.createElement('canvas');
      base.width = image.naturalWidth;
      base.height = image.naturalHeight;
      base.getContext('2d')!.drawImage(image, 0, 0);
      baseRef.current = base;
      checkpoints.current.set(0, base);
      setDoc(copyCanvas(base));
      requestAnimationFrame(() => fit(base.width, base.height));
    }).catch(() => {
      toast.error(loadFailedRef.current);
      closeRef.current();
    });
    return () => { cancelled = true; };
  }, [version, setDoc, fit]);

  useEffect(() => { paint(); }, [size, paint]);

  /** Rebuilds the result for <c>next</c> from the nearest checkpoint (undo/redo). */
  const rebuild = useCallback((next: EditHistory) => {
    let at = checkpointFor(next.cursor);
    while (at > 0 && !checkpoints.current.has(at)) at -= 1;
    let image = checkpoints.current.get(at) ?? baseRef.current!;
    for (let i = at; i < next.cursor; i += 1) {
      image = applyOp(image, next.ops[i]);
      if ((i + 1) % 10 === 0) checkpoints.current.set(i + 1, image);
    }
    setDoc(image === baseRef.current ? copyCanvas(image) : image);
  }, [setDoc]);

  /** Records an operation whose result is <c>result</c> (already computed). */
  const commit = useCallback((op: EditOp, result: HTMLCanvasElement) => {
    let next = pushOp(historyRef.current, op);
    for (const key of [...checkpoints.current.keys()]) if (key >= next.cursor) checkpoints.current.delete(key);
    if (next.cursor % 10 === 0) checkpoints.current.set(next.cursor, result);
    const extra = overflow(next);
    if (extra > 0) {
      // Past MAX_UNDO the oldest operations are drawn into the base; the shifted checkpoints are dropped.
      let base = baseRef.current!;
      for (let i = 0; i < extra; i += 1) base = applyOp(base, next.ops[i]);
      baseRef.current = base;
      checkpoints.current = new Map([[0, base]]);
      next = foldFirst(next, extra);
    }
    setHistory(next);
    setDoc(result);
  }, [setDoc]);

  const doUndo = useCallback(() => {
    if (stroke.current || !canUndo(historyRef.current)) return;
    const next = undo(historyRef.current);
    setHistory(next);
    rebuild(next);
    setCrop(null);
  }, [rebuild]);

  const doRedo = useCallback(() => {
    if (stroke.current || !canRedo(historyRef.current)) return;
    const next = redo(historyRef.current);
    setHistory(next);
    rebuild(next);
    setCrop(null);
  }, [rebuild]);

  const transform = useCallback((op: EditOp) => {
    const doc = docRef.current;
    if (!doc) return;
    const result = applyOp(doc, op);
    commit(op, result);
    setOrigin(null);
    setCloneOffset(null);
    setCrop(null);
    requestAnimationFrame(() => fit(result.width, result.height));
  }, [commit, fit]);

  const startCrop = useCallback(() => {
    const doc = docRef.current;
    if (doc) setCrop({ x: 0, y: 0, w: doc.width, h: doc.height });
  }, []);

  useEffect(() => {
    if (tool === 'crop' && !crop) startCrop();
    if (tool !== 'crop') setCrop(null);
  }, [tool]); // eslint-disable-line react-hooks/exhaustive-deps -- only on tool changes

  const confirmCrop = () => {
    const doc = docRef.current;
    if (!doc || !crop) return;
    if (crop.w < MIN_CROP || crop.h < MIN_CROP) {
      toast.warning(t('mapGenerator.editor.cropTooSmall'));
      return;
    }
    if (crop.x === 0 && crop.y === 0 && crop.w === doc.width && crop.h === doc.height) return;
    transform({ kind: 'crop', rect: crop });
    setTool('brush');
  };

  // ---------------------------------------------------------------- pointer

  const toImage = (clientX: number, clientY: number): Point | null => {
    const display = displayRef.current;
    if (!display) return null;
    const rect = display.getBoundingClientRect();
    return { x: ((clientX - rect.left) * display.width) / rect.width, y: ((clientY - rect.top) * display.height) / rect.height };
  };

  const handleAt = (p: Point, rect: Rect): string | null => {
    const tolerance = HANDLE / view.zoom;
    const xs: Record<string, number> = { w: rect.x, c: rect.x + rect.w / 2, e: rect.x + rect.w };
    const ys: Record<string, number> = { n: rect.y, m: rect.y + rect.h / 2, s: rect.y + rect.h };
    for (const [vy, y] of Object.entries(ys)) {
      for (const [hx, x] of Object.entries(xs)) {
        if (vy === 'm' && hx === 'c') continue;
        if (Math.abs(p.x - x) <= tolerance && Math.abs(p.y - y) <= tolerance) return `${vy}${hx}`;
      }
    }
    return null;
  };

  const dragCrop = (p: Point) => {
    const drag = cropDrag.current;
    const doc = docRef.current;
    if (!drag || !doc) return;
    const dx = p.x - drag.start.x;
    const dy = p.y - drag.start.y;
    const r = { ...drag.rect };
    if (drag.kind === 'move') {
      r.x += dx;
      r.y += dy;
    } else if (drag.kind === 'new') {
      r.w = dx;
      r.h = dy;
    } else {
      if (drag.kind.includes('w')) { r.x += dx; r.w -= dx; }
      if (drag.kind.includes('e')) r.w += dx;
      if (drag.kind.startsWith('n')) { r.y += dy; r.h -= dy; }
      if (drag.kind.startsWith('s')) r.h += dy;
    }
    const ratio = ratioLocked ? drag.rect.w / drag.rect.h : null;
    setCrop(clampRect(r, doc.width, doc.height, ratio));
  };

  const onPointerDown = (event: ReactPointerEvent<HTMLDivElement>) => {
    event.currentTarget.setPointerCapture(event.pointerId);
    pointers.current.set(event.pointerId, { x: event.clientX, y: event.clientY });
    // Two fingers, the middle button, space or the pan tool move the view.
    if (pointers.current.size >= 2 || event.button === 1 || spaceDown.current || tool === 'pan') {
      stroke.current = null;
      cropDrag.current = null;
      const pts = [...pointers.current.values()];
      const pinch = pts.length >= 2 ? Math.hypot(pts[0].x - pts[1].x, pts[0].y - pts[1].y) : null;
      panning.current = { start: { x: event.clientX, y: event.clientY }, view, pinch };
      paint();
      return;
    }
    if (event.button !== 0) return;
    const p = toImage(event.clientX, event.clientY);
    const doc = docRef.current;
    if (!p || !doc) return;

    if (tool === 'crop' && crop) {
      const handle = handleAt(p, crop);
      const inside = p.x >= crop.x && p.x <= crop.x + crop.w && p.y >= crop.y && p.y <= crop.y + crop.h;
      cropDrag.current = { kind: handle ?? (inside ? 'move' : 'new'), start: p, rect: handle || inside ? crop : { x: p.x, y: p.y, w: 0, h: 0 } };
      return;
    }
    if (tool === 'brush' && picking) {
      const picked = pickColor(doc, p);
      if (picked) setColor(picked);
      setPicking(false);
      return;
    }
    if (tool === 'clone') {
      if (event.altKey || originMode) {
        setOrigin(p);
        setCloneOffset(null);
        setOriginMode(false);
        return;
      }
      if (!origin) {
        toast.info(t('mapGenerator.editor.noOrigin'));
        return;
      }
      const offset = cloneOffset ?? { x: origin.x - p.x, y: origin.y - p.y };
      setCloneOffset(offset);
      const op: Extract<EditOp, { kind: 'clone' }> = { kind: 'clone', size: brushSize, opacity, points: [p], offset };
      stroke.current = { layer: new StrokeLayer(doc, op), op };
    } else if (tool === 'brush') {
      const op: Extract<EditOp, { kind: 'brush' }> = { kind: 'brush', color, size: brushSize, opacity, points: [p] };
      stroke.current = { layer: new StrokeLayer(doc, op), op };
    } else {
      return;
    }
    stroke.current.layer.extend(p);
    paint();
  };

  const onPointerMove = (event: ReactPointerEvent<HTMLDivElement>) => {
    const p = toImage(event.clientX, event.clientY);
    setHover(p);
    if (pointers.current.has(event.pointerId)) pointers.current.set(event.pointerId, { x: event.clientX, y: event.clientY });
    if (panning.current) {
      const pan = panning.current;
      const pts = [...pointers.current.values()];
      if (pan.pinch && pts.length >= 2) {
        const distance = Math.hypot(pts[0].x - pts[1].x, pts[0].y - pts[1].y);
        const zoom = Math.min(8, Math.max(0.05, (pan.view.zoom * distance) / pan.pinch));
        const area = areaRef.current!.getBoundingClientRect();
        const cx = (pts[0].x + pts[1].x) / 2 - area.left;
        const cy = (pts[0].y + pts[1].y) / 2 - area.top;
        setView({ zoom, panX: cx - ((cx - pan.view.panX) * zoom) / pan.view.zoom, panY: cy - ((cy - pan.view.panY) * zoom) / pan.view.zoom });
      } else {
        setView({ ...pan.view, panX: pan.view.panX + event.clientX - pan.start.x, panY: pan.view.panY + event.clientY - pan.start.y });
      }
      return;
    }
    if (!p) return;
    if (cropDrag.current) {
      dragCrop(p);
      return;
    }
    if (stroke.current) {
      stroke.current.op.points.push(p);
      stroke.current.layer.extend(p);
      paint();
    }
  };

  const onPointerUp = (event: ReactPointerEvent<HTMLDivElement>) => {
    pointers.current.delete(event.pointerId);
    if (panning.current) {
      if (pointers.current.size === 0) panning.current = null;
      return;
    }
    cropDrag.current = null;
    const active = stroke.current;
    if (!active) return;
    stroke.current = null;
    const result = document.createElement('canvas');
    result.width = docRef.current!.width;
    result.height = docRef.current!.height;
    active.layer.composeOnto(result);
    commit(active.op, result);
  };

  const onWheel = (event: ReactWheelEvent<HTMLDivElement>) => {
    const area = areaRef.current!.getBoundingClientRect();
    const factor = event.deltaY < 0 ? 1.15 : 1 / 1.15;
    zoomAround(factor, event.clientX - area.left, event.clientY - area.top);
  };

  const zoomAround = (factor: number, cx: number, cy: number) => setView((v) => {
    const zoom = Math.min(8, Math.max(0.05, v.zoom * factor));
    return { zoom, panX: cx - ((cx - v.panX) * zoom) / v.zoom, panY: cy - ((cy - v.panY) * zoom) / v.zoom };
  });

  // ---------------------------------------------------------------- keyboard and closing

  const requestClose = useCallback(() => {
    if (!isEmpty(historyRef.current)) setConfirming(true);
    else closeRef.current();
  }, []);

  useEffect(() => {
    if (!open) return undefined;
    const typing = (target: EventTarget | null) => target instanceof HTMLElement && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA');
    const onKeyDown = (event: KeyboardEvent) => {
      if (typing(event.target)) return;
      const key = event.key.toLowerCase();
      if ((event.ctrlKey || event.metaKey) && key === 'z') {
        event.preventDefault();
        if (event.shiftKey) doRedo(); else doUndo();
      } else if ((event.ctrlKey || event.metaKey) && key === 'y') {
        event.preventDefault();
        doRedo();
      } else if (event.key === ' ') {
        spaceDown.current = true;
      } else if (event.key === '[') {
        setBrushSize((s) => Math.max(MIN_SIZE, Math.round(s / 1.2)));
      } else if (event.key === ']') {
        setBrushSize((s) => Math.min(MAX_SIZE, Math.round(s * 1.2) + 1));
      } else if (!event.ctrlKey && !event.metaKey && !event.altKey) {
        const tools: Record<string, EditorTool> = { b: 'brush', s: 'clone', c: 'crop', r: 'rotate' };
        if (tools[key]) setTool(tools[key]);
      }
    };
    const onKeyUp = (event: KeyboardEvent) => { if (event.key === ' ') spaceDown.current = false; };
    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
    };
  }, [open, doUndo, doRedo]);

  const apply = () => {
    const doc = docRef.current;
    if (!doc || !version || isEmpty(historyRef.current)) return;
    const url = doc.toDataURL('image/png');
    onApply({ url, base64: base64Of(url), mediaType: 'image/png' }, version.version);
  };

  // ---------------------------------------------------------------- render

  const width = size?.width ?? 0;
  const height = size?.height ?? 0;
  const box = { left: view.panX, top: view.panY, width: width * view.zoom, height: height * view.zoom };
  const painting = tool === 'brush' || tool === 'clone';
  const source = tool === 'clone' && hover ? (cloneOffset ? { x: hover.x + cloneOffset.x, y: hover.y + cloneOffset.y } : origin) : null;
  const stroke1 = 1.5 / view.zoom;

  return (
    <>
      <Modal open={open} onOpenChange={(value) => { if (!value) requestClose(); }}
        title={t('mapGenerator.editor.title', { version: version?.version ?? '' })}
        className="stm-image-editor-modal" bodyClassName="stm-image-editor-body"
        footer={(
          <>
            <small className="text-body-secondary me-auto">
              {t('mapGenerator.editor.dims', { width, height, zoom: Math.round(view.zoom * 100) })}
            </small>
            <button type="button" className="btn btn-secondary" onClick={requestClose}>{t('mapGenerator.editor.cancel')}</button>
            <button type="button" className="btn btn-primary" onClick={apply} disabled={!dirty}>{t('mapGenerator.editor.apply')}</button>
          </>
        )}
      >
        <ImageEditorToolbar
          tool={tool} onTool={(next) => { setTool(next); setPicking(false); setOriginMode(false); }}
          color={color} onColor={setColor} picking={picking} onPicking={setPicking}
          size={brushSize} onSize={setBrushSize} opacity={opacity} onOpacity={setOpacity}
          originMode={originMode} onOriginMode={setOriginMode} hasOrigin={origin !== null}
          ratioLocked={ratioLocked} onRatioLocked={setRatioLocked} onCropConfirm={confirmCrop} onCropReset={startCrop}
          onRotate={(dir) => transform({ kind: 'rotate', dir })} onFlip={(axis) => transform({ kind: 'flip', axis })}
          canUndo={canUndo(history)} canRedo={canRedo(history)} onUndo={doUndo} onRedo={doRedo}
          onZoom={(factor) => { const a = areaRef.current; if (a) zoomAround(factor, a.clientWidth / 2, a.clientHeight / 2); }}
          onFit={() => size && fit(size.width, size.height)}
        />
        <div ref={areaRef} className={`stm-image-editor-area${tool === 'pan' ? ' is-pan' : ''}`}
          onPointerDown={onPointerDown} onPointerMove={onPointerMove} onPointerUp={onPointerUp} onPointerCancel={onPointerUp}
          onPointerLeave={() => setHover(null)} onWheel={onWheel} onContextMenu={(e) => e.preventDefault()}>
          <canvas ref={displayRef} className="stm-image-editor-canvas" style={box} />
          {size && (
            <svg className="stm-image-editor-overlay" style={box} viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none" aria-hidden="true">
              {painting && hover && !picking && (
                <circle cx={hover.x} cy={hover.y} r={brushSize / 2} className="stm-image-editor-cursor" strokeWidth={stroke1} />
              )}
              {source && (
                <g className="stm-image-editor-source" strokeWidth={stroke1}>
                  <circle cx={source.x} cy={source.y} r={brushSize / 2} />
                  <line x1={source.x - 8 / view.zoom} y1={source.y} x2={source.x + 8 / view.zoom} y2={source.y} />
                  <line x1={source.x} y1={source.y - 8 / view.zoom} x2={source.x} y2={source.y + 8 / view.zoom} />
                </g>
              )}
              {tool === 'crop' && crop && (
                <g className="stm-image-editor-crop">
                  <path fillRule="evenodd" className="stm-image-editor-shade"
                    d={`M0 0H${width}V${height}H0Z M${crop.x} ${crop.y}V${crop.y + crop.h}H${crop.x + crop.w}V${crop.y}Z`} />
                  <rect x={crop.x} y={crop.y} width={crop.w} height={crop.h} strokeWidth={stroke1} />
                  {[crop.x, crop.x + crop.w / 2, crop.x + crop.w].flatMap((x, i) => [crop.y, crop.y + crop.h / 2, crop.y + crop.h]
                    .filter((_, j) => !(i === 1 && j === 1))
                    .map((y) => <rect key={`${x}-${y}`} x={x - 5 / view.zoom} y={y - 5 / view.zoom} width={10 / view.zoom} height={10 / view.zoom}
                      className="stm-image-editor-handle" strokeWidth={stroke1} />))}
                  <text x={crop.x + 6 / view.zoom} y={crop.y + 18 / view.zoom} fontSize={13 / view.zoom}>{crop.w} × {crop.h}</text>
                </g>
              )}
            </svg>
          )}
        </div>
      </Modal>
      <ConfirmModal
        open={confirming}
        onOpenChange={setConfirming}
        title={t('mapGenerator.editor.discardTitle')}
        message={t('mapGenerator.editor.discardMessage')}
        confirmLabel={t('mapGenerator.editor.discard')}
        onConfirm={() => { setConfirming(false); onClose(); }}
        danger
      />
    </>
  );
};

export default MapImageEditor;
