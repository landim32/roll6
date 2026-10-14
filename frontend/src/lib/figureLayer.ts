import { hiddenFrom } from './raycastFrame';
import type { FrameLayer } from './raycastFrame';
import { mipChainOf, mipLevelFor, sampleBilinear } from './mipmap';

/**
 * The figures of the "Ultra" level (053): drawn on a transparent layer the size of the screen, over the blown-up world
 * frame, so they are as sharp as the screen while the walls and the floor keep their retro blocks. Pure (no DOM): the
 * renderer puts `target` on its own canvas and composes it with `drawImage`.
 *
 * The occlusion is the frame's: the wall in front of a screen column is the wall of the frame column under it, and the
 * row where a figure disappears is the frame row scaled to the screen — the edge of a wall drawn at frame resolution is
 * exactly where the eye sees it, so a finer occlusion would be wrong, not better.
 */

/** RGBA, straight (not premultiplied) alpha, as a canvas `ImageData` wants it. */
export interface LayerTarget {
  data: Uint8ClampedArray;
  width: number;
  height: number;
}

export const clearLayer = (target: LayerTarget): void => {
  target.data.fill(0);
};

const sample = new Float32Array(4);

/** Draws `layer.sprites` (far to near) into `target`, scaled from a frame `frameWidth × frameHeight`. */
export const drawFigureLayer = (
  target: LayerTarget,
  layer: FrameLayer,
  frameWidth: number,
  frameHeight: number,
  /** Filled with the depth of the figures at the layer's size (057, for the 3D models): `0` where none covers a pixel. */
  depth?: Float32Array,
): void => {
  const { data, width, height } = target;
  const figureDepth = depth && depth.length >= width * height ? depth : null;
  figureDepth?.fill(0);
  if (width <= 0 || height <= 0 || frameWidth <= 0 || frameHeight <= 0) return;
  const scaleX = width / frameWidth;
  const scaleY = height / frameHeight;
  for (const { pixels, mirrored, where, fade } of layer.sprites) {
    const x0 = where.screenX0 * scaleX;
    const x1 = where.screenX1 * scaleX;
    const top = where.top * scaleY;
    const bottom = where.bottom * scaleY;
    const span = x1 - x0;
    const tall = bottom - top;
    if (span <= 0 || tall <= 0) continue;
    const chain = mipChainOf(pixels);
    const level = chain.levels[mipLevelFor(chain, pixels.width / span)];
    const first = Math.max(0, Math.ceil(top));
    const last = Math.min(height - 1, Math.floor(bottom));
    for (let x = Math.max(0, Math.ceil(x0)); x <= Math.min(width - 1, Math.floor(x1)); x++) {
      const frameColumn = Math.min(frameWidth - 1, Math.floor((x * frameWidth) / width));
      // Everything from this screen row down is behind a nearer wall (Infinity: nothing in the way).
      const hiddenRow = hiddenFrom(layer.walls, frameColumn, where.depth) * scaleY;
      if (hiddenRow <= first) continue;
      const across = (x + 0.5 - x0) / span;
      const u = mirrored ? 1 - across : across;
      const lastVisible = Math.min(last, Math.ceil(hiddenRow) - 1);
      for (let y = first; y <= lastVisible; y++) {
        sampleBilinear(level, u, (y + 0.5 - top) / tall, sample);
        const alpha = sample[3] / 255;
        if (alpha <= 0) continue;
        const i = (y * width + x) * 4;
        // Source over, in premultiplied terms, then back to straight alpha for the canvas.
        const under = data[i + 3] / 255;
        const keep = under * (1 - alpha);
        const outAlpha = alpha + keep;
        data[i] = (sample[0] * fade + data[i] * keep) / outAlpha;
        data[i + 1] = (sample[1] * fade + data[i + 1] * keep) / outAlpha;
        data[i + 2] = (sample[2] * fade + data[i + 2] * keep) / outAlpha;
        data[i + 3] = outAlpha * 255;
        if (figureDepth && alpha >= 0.5) {
          const at = y * width + x;
          if (figureDepth[at] === 0 || where.depth < figureDepth[at]) figureDepth[at] = where.depth;
        }
      }
    }
  }
};
