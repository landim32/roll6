import { useCallback, useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';
import { useMapEditor } from './useMapEditor';
import { useMapPaint } from './useMapPaint';
import { isInsideGrid, pixelToHex } from '../lib/hexGrid';
import type { Offset, Point } from '../lib/hexGrid';
import {
  dragHexes, drawingFromDrag, drawingFromStroke, fillWrites, hitDrawing, markAt,
} from '../lib/mapPaint';
import type { PaintStyle } from '../lib/mapPaint';
import { PAINT_TOOL, TOOL_DRAWING } from '../types/mapPaint';
import type { DrawingKind, MapDrawingInsertInfo, PaintPoint, PaintSettings } from '../types/mapPaint';

/** Moves under this distance (screen px) between press and release count as a click. */
const CLICK_TOLERANCE = 4;

/** What the map shows of a gesture in progress (or waiting for the server). */
export interface PaintPreview {
  /** Hexes of a fill drag. */
  hexes: Offset[];
  /** `true` when the fill erases (kind "Nenhum"). */
  erasing: boolean;
  /** The drawing being dragged or stroked. */
  drawing: MapDrawingInsertInfo | null;
}

interface Gesture {
  settings: PaintSettings;
  startClient: { x: number; y: number };
  start: Point;
  moved: boolean;
  lastHex: Offset | null;
  hexes: Offset[];
  hexKeys: Set<string>;
  points: PaintPoint[];
}

const styleOf = (settings: PaintSettings): PaintStyle => ({
  color: settings.color, width: settings.width, opacity: settings.opacity,
});

const errorMessage = (err: unknown): string => (err instanceof Error ? err.message : String(err));

/**
 * The paint gesture on the 2D map (107): fill drags collect hexes and send them once on release; rectangle, circle,
 * line and arrow are dragged from a point to another (a click does nothing); the pencil strokes freely; the eraser
 * removes the drawing under the click, else the hex's mark. Esc or a right click discard the gesture. The preview is
 * kept until the server answers (no optimistic paint); a failure toasts the server's message.
 */
export const useMapPaintTool = () => {
  const { draft, hexSize, paintMode } = useMapEditor();
  const { paint, canPaint, settings, setHexMarks, addDrawing, deleteDrawing } = useMapPaint();
  const active = paintMode && canPaint;
  const gesture = useRef<Gesture | null>(null);
  const [preview, setPreview] = useState<PaintPreview | null>(null);
  /** Counts gestures, so a late answer doesn't clear a newer preview. */
  const serial = useRef(0);

  const discard = useCallback((): boolean => {
    const had = gesture.current !== null;
    gesture.current = null;
    serial.current += 1;
    setPreview(null);
    return had;
  }, []);

  // Paint off, another map, another view or the right lost: whatever was in progress is dropped.
  useEffect(() => {
    discard();
  }, [active, draft.mapId, discard]);

  useEffect(() => {
    if (!active) return undefined;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && gesture.current) discard();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [active, discard]);

  const previewOf = (g: Gesture, point: Point): PaintPreview => {
    const kind = TOOL_DRAWING[g.settings.tool] as DrawingKind | undefined;
    let drawing: MapDrawingInsertInfo | null = null;
    if (kind !== undefined && g.moved) {
      drawing = g.settings.tool === PAINT_TOOL.pencil
        ? { kind, points: g.points, ...styleOf(g.settings) }
        : drawingFromDrag(kind, g.start, point, styleOf(g.settings));
    }
    return { hexes: g.hexes, erasing: g.settings.fillKind === null, drawing };
  };

  const addHexes = (g: Gesture, point: Point) => {
    const hex = pixelToHex(point, hexSize);
    if (g.lastHex && g.lastHex.x === hex.x && g.lastHex.y === hex.y) return;
    dragHexes(g.lastHex, hex, draft.gridWidth, draft.gridHeight).forEach((h) => {
      const key = `${h.x},${h.y}`;
      if (g.hexKeys.has(key)) return;
      g.hexKeys.add(key);
      g.hexes = [...g.hexes, h];
    });
    g.lastHex = hex;
  };

  /** Left button pressed on the map (`point` in map px, `client` in screen px). */
  const down = (point: Point, client: { x: number; y: number }) => {
    if (!active) return;
    serial.current += 1;
    const g: Gesture = {
      settings, startClient: client, start: point, moved: false, lastHex: null, hexes: [], hexKeys: new Set(),
      points: [[point.x, point.y]],
    };
    gesture.current = g;
    if (settings.tool === PAINT_TOOL.fill) addHexes(g, point);
    setPreview(previewOf(g, point));
  };

  const move = (point: Point, client: { x: number; y: number }) => {
    const g = gesture.current;
    if (!g) return;
    if (!g.moved && Math.hypot(client.x - g.startClient.x, client.y - g.startClient.y) >= CLICK_TOLERANCE) g.moved = true;
    if (g.settings.tool === PAINT_TOOL.fill) addHexes(g, point);
    else if (g.settings.tool === PAINT_TOOL.pencil) g.points = [...g.points, [point.x, point.y]];
    setPreview(previewOf(g, point));
  };

  /** Runs the write; the preview stays until it answers. */
  const send = (write: () => Promise<unknown>) => {
    const mine = serial.current;
    write()
      .catch((err: unknown) => toast.error(errorMessage(err)))
      .finally(() => {
        if (serial.current === mine) setPreview(null);
      });
  };

  const up = (point: Point, client: { x: number; y: number }) => {
    const g = gesture.current;
    if (!g) return;
    move(point, client);
    gesture.current = null;
    const { tool } = g.settings;

    if (tool === PAINT_TOOL.fill) {
      const writes = fillWrites(g.hexes, g.settings.fillKind, g.settings.markText, paint);
      if (writes.length === 0) setPreview(null);
      else send(() => setHexMarks(writes));
      return;
    }

    if (tool === PAINT_TOOL.erase) {
      setPreview(null);
      if (g.moved) return;
      const drawing = paint ? hitDrawing(paint.drawings, point) : null;
      if (drawing) {
        send(() => deleteDrawing(drawing.mapDrawingId));
        return;
      }
      const hex = pixelToHex(point, hexSize);
      if (isInsideGrid(hex, draft.gridWidth, draft.gridHeight) && markAt(paint, hex.x, hex.y))
        send(() => setHexMarks([{ x: hex.x, y: hex.y, kind: null }]));
      return;
    }

    const kind = TOOL_DRAWING[tool];
    const drawing = !g.moved || kind === undefined
      ? null
      : tool === PAINT_TOOL.pencil
        ? drawingFromStroke(g.points, styleOf(g.settings))
        : drawingFromDrag(kind, g.start, point, styleOf(g.settings));
    if (!drawing) {
      setPreview(null);
      return;
    }
    setPreview({ hexes: [], erasing: false, drawing });
    send(() => addDrawing(drawing));
  };

  /** Right click / Esc: discards the gesture in progress; true when there was one. */
  const cancel = (): boolean => discard();

  return { active, preview, down, move, up, cancel };
};

export default useMapPaintTool;
