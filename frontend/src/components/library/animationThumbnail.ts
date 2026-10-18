import { keyPoseTime } from '../../lib/keyPose';
import { figureSegments, projectPoint, samplePose } from '../../lib/skeletonFigure';
import type { Roll6Clip } from '../../lib/roll6Clips';
import { THUMBNAIL_SIZE, canvasToPng } from './thumbnailCanvas';

/** Share of the picture left empty around the figure. */
const MARGIN = 0.1;
const FALLBACK_COLOR = '#1fd67a';

const accentColor = (): string => {
  if (typeof document === 'undefined') return FALLBACK_COLOR;
  return getComputedStyle(document.documentElement).getPropertyValue('--stm-accent').trim() || FALLBACK_COLOR;
};

/**
 * The library card's picture of an animation (090, Q3 = A): the standard skeleton figure in the animation's key pose
 * (`lib/keyPose`), seen three-quarters from the front, on a transparent square. Plain 2D canvas — no three.js — so it is
 * cheap enough to draw live for the cards without a stored picture.
 */
export const renderAnimationThumbnail = async (clip: Pick<Roll6Clip, 'tracks' | 'hipsLift'>): Promise<Blob> => {
  const segments = figureSegments(samplePose(clip, keyPoseTime(clip))).map(({ from, to }) => ({
    from: projectPoint(from),
    to: projectPoint(to),
    depth: (projectPoint(from)[2] + projectPoint(to)[2]) / 2,
  }));
  const xs = segments.flatMap((s) => [s.from[0], s.to[0]]);
  const ys = segments.flatMap((s) => [s.from[1], s.to[1]]);
  const [minX, maxX, minY, maxY] = [Math.min(...xs), Math.max(...xs), Math.min(...ys), Math.max(...ys)];
  const size = THUMBNAIL_SIZE;
  const scale = (size * (1 - 2 * MARGIN)) / Math.max(maxX - minX, maxY - minY, 1e-3);
  const offsetX = size / 2 - ((minX + maxX) / 2) * scale;
  const offsetY = size / 2 + ((minY + maxY) / 2) * scale;
  const toScreen = ([x, y]: [number, number, number]): [number, number] => [offsetX + x * scale, offsetY - y * scale];

  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const context = canvas.getContext('2d');
  if (!context) throw new Error('canvas not supported');
  const color = accentColor();
  context.lineCap = 'round';
  context.lineJoin = 'round';
  // Far limbs first, a little dimmer, so the near ones read on top.
  const depths = segments.map((s) => s.depth);
  const [near, far] = [Math.max(...depths), Math.min(...depths)];
  for (const segment of [...segments].sort((a, b) => a.depth - b.depth)) {
    const shade = near - far > 1e-6 ? (segment.depth - far) / (near - far) : 1;
    context.globalAlpha = 0.55 + 0.45 * shade;
    context.strokeStyle = color;
    context.lineWidth = size * 0.035;
    const [x1, y1] = toScreen(segment.from);
    const [x2, y2] = toScreen(segment.to);
    context.beginPath();
    context.moveTo(x1, y1);
    context.lineTo(x2, y2);
    context.stroke();
  }
  context.globalAlpha = 1;
  return canvasToPng(canvas);
};

export default renderAnimationThumbnail;
