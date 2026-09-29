import { gridPath, gridPixelSize, hexCenter } from './hexGrid';
import { MAP_TOKEN_TYPE } from '../types/mapToken';

/** Rectangle in map pixels (the image may start above or to the left of the grid). */
export interface SnapshotBounds {
  x: number;
  y: number;
  width: number;
  height: number;
}

/** What the snapshot needs from the open map. */
export interface SnapshotDraft {
  gridWidth: number;
  gridHeight: number;
  imageUrl: string | null;
  imageLeft: number;
  imageTop: number;
  imageWidth: number | null;
  imageHeight: number | null;
}

/** What the snapshot needs from a piece. */
export interface SnapshotToken {
  x: number;
  y: number;
  look: number;
  name: string;
  tokenType: number;
  upImageUrl: string | null;
}

const BACKGROUND = '#1a1d21';
const GRID_STROKE = 'rgba(230, 230, 240, 0.35)';
const MAX_SIDE = 2048;

const DISC: Record<number, { fill: string; stroke: string }> = {
  [MAP_TOKEN_TYPE.character]: { fill: 'rgba(13, 110, 253, 0.35)', stroke: 'rgba(110, 168, 254, 0.85)' },
  [MAP_TOKEN_TYPE.npc]: { fill: 'rgba(220, 53, 69, 0.35)', stroke: 'rgba(234, 134, 143, 0.85)' },
};

const OBJECT_DISC = { fill: 'rgba(108, 117, 125, 0.35)', stroke: 'rgba(173, 181, 189, 0.6)' };

const union = (a: SnapshotBounds, b: SnapshotBounds): SnapshotBounds => {
  const x = Math.min(a.x, b.x);
  const y = Math.min(a.y, b.y);
  const right = Math.max(a.x + a.width, b.x + b.width);
  const bottom = Math.max(a.y + a.height, b.y + b.height);
  return { x, y, width: right - x, height: bottom - y };
};

/**
 * Union of the grid rectangle and the background image (drawn at −imageLeft, −imageTop).
 * `hexSize` is the center-to-corner size the grid was measured with.
 */
export const snapshotBounds = (
  draft: SnapshotDraft,
  gridSize: { width: number; height: number },
  hexSize: number,
): SnapshotBounds => {
  if (hexSize <= 0 || gridSize.width <= 0 || gridSize.height <= 0)
    return { x: 0, y: 0, width: 0, height: 0 };
  let bounds: SnapshotBounds = { x: 0, y: 0, width: gridSize.width, height: gridSize.height };
  if (draft.imageUrl && draft.imageWidth && draft.imageHeight && draft.imageWidth > 0 && draft.imageHeight > 0) {
    bounds = union(bounds, {
      x: -draft.imageLeft,
      y: -draft.imageTop,
      width: draft.imageWidth,
      height: draft.imageHeight,
    });
  }
  return bounds;
};

/** Scale that keeps the longest side at most `maxSide` pixels. Smaller maps stay at 1. */
export const snapshotScale = (bounds: SnapshotBounds, maxSide = MAX_SIDE): number => {
  const side = Math.max(bounds.width, bounds.height);
  if (side <= 0 || side <= maxSide) return 1;
  return maxSide / side;
};

/** Loads an image for the canvas. A failure resolves null so the canvas stays exportable. */
export const loadImage = (url: string): Promise<HTMLImageElement | null> =>
  new Promise((resolve) => {
    const image = new Image();
    image.crossOrigin = 'anonymous';
    image.onload = () => resolve(image);
    image.onerror = () => resolve(null);
    image.src = url;
  });

const drawInitial = (ctx: CanvasRenderingContext2D, name: string, radius: number) => {
  const letter = name.trim().charAt(0).toUpperCase() || '?';
  ctx.fillStyle = '#dee2e6';
  ctx.font = `600 ${radius}px sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(letter, 0, 0);
};

const drawToken = (
  ctx: CanvasRenderingContext2D,
  token: SnapshotToken,
  hexSize: number,
  image: HTMLImageElement | null,
) => {
  const center = hexCenter(token.x, token.y, hexSize);
  const radius = hexSize * 0.8;
  const mark = hexSize * 0.18;
  const disc = DISC[token.tokenType] ?? OBJECT_DISC;
  ctx.save();
  ctx.translate(center.x, center.y);
  ctx.rotate(((token.look - 3) * 60 * Math.PI) / 180);
  ctx.beginPath();
  ctx.arc(0, 0, radius, 0, Math.PI * 2);
  ctx.fillStyle = disc.fill;
  ctx.fill();
  ctx.lineWidth = 2;
  ctx.strokeStyle = disc.stroke;
  ctx.stroke();
  if (image) {
    ctx.save();
    ctx.beginPath();
    ctx.arc(0, 0, radius, 0, Math.PI * 2);
    ctx.clip();
    ctx.drawImage(image, -radius, -radius, radius * 2, radius * 2);
    ctx.restore();
  } else {
    drawInitial(ctx, token.name, radius);
  }
  ctx.beginPath();
  ctx.moveTo(-mark, radius - 1);
  ctx.lineTo(0, radius + mark);
  ctx.lineTo(mark, radius - 1);
  ctx.closePath();
  ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
  ctx.strokeStyle = 'rgba(0, 0, 0, 0.55)';
  ctx.lineWidth = 1;
  ctx.fill();
  ctx.stroke();
  ctx.restore();
};

/** JPEG of the open map: dark background, scene image, hex outlines and pieces. */
export const renderMapSnapshot = async (input: {
  draft: SnapshotDraft;
  tokens: SnapshotToken[];
  hexSize: number;
}): Promise<Blob> => {
  const { draft, tokens, hexSize } = input;
  const grid = gridPixelSize(draft.gridWidth, draft.gridHeight, hexSize);
  const bounds = snapshotBounds(draft, grid, hexSize);
  const scale = snapshotScale(bounds);
  const width = Math.max(1, Math.round(bounds.width * scale));
  const height = Math.max(1, Math.round(bounds.height * scale));
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('canvas');

  ctx.fillStyle = BACKGROUND;
  ctx.fillRect(0, 0, width, height);
  ctx.setTransform(scale, 0, 0, scale, -bounds.x * scale, -bounds.y * scale);

  if (draft.imageUrl && draft.imageWidth && draft.imageHeight) {
    const image = await loadImage(draft.imageUrl);
    if (image) ctx.drawImage(image, -draft.imageLeft, -draft.imageTop, draft.imageWidth, draft.imageHeight);
  }

  ctx.strokeStyle = GRID_STROKE;
  ctx.lineWidth = 1;
  ctx.stroke(new Path2D(gridPath(draft.gridWidth, draft.gridHeight, hexSize)));

  const pictures = await Promise.all(tokens.map((token) => (token.upImageUrl ? loadImage(token.upImageUrl) : Promise.resolve(null))));
  tokens.forEach((token, index) => drawToken(ctx, token, hexSize, pictures[index]));

  const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob((value) => resolve(value), 'image/jpeg', 0.9));
  if (!blob) throw new Error('snapshot');
  return blob;
};
