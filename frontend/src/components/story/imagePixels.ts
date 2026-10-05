import type { PixelBuffer } from '../../lib/raycastFrame';

export type { PixelBuffer } from '../../lib/raycastFrame';

/**
 * Reads an image into pixels, scaled down so its longest side is at most `maxSide`. Null when the canvas can't be read
 * (an image from another origin without CORS) — the caller then shows the default colors.
 */
export const toPixels = (image: HTMLImageElement | HTMLCanvasElement, maxSide: number): PixelBuffer | null => {
  const sourceWidth = image instanceof HTMLImageElement ? image.naturalWidth : image.width;
  const sourceHeight = image instanceof HTMLImageElement ? image.naturalHeight : image.height;
  if (sourceWidth <= 0 || sourceHeight <= 0) return null;
  const scale = Math.min(1, maxSide / Math.max(sourceWidth, sourceHeight));
  const width = Math.max(1, Math.round(sourceWidth * scale));
  const height = Math.max(1, Math.round(sourceHeight * scale));
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  if (!ctx) return null;
  try {
    ctx.drawImage(image, 0, 0, width, height);
    return { data: ctx.getImageData(0, 0, width, height).data, width, height };
  } catch {
    return null;
  }
};

/** A round placeholder with the initial, for pieces without a usable image. */
export const initialPixels = (name: string, color: string): PixelBuffer => {
  const canvas = document.createElement('canvas');
  canvas.width = 96;
  canvas.height = 96;
  const ctx = canvas.getContext('2d', { willReadFrequently: true })!;
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.arc(48, 48, 44, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#f8f9fa';
  ctx.font = '600 48px sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(name.trim().charAt(0).toUpperCase() || '?', 48, 51);
  return { data: ctx.getImageData(0, 0, 96, 96).data, width: 96, height: 96 };
};
