/** Crop area in pixels of the source image (react-easy-crop's `croppedAreaPixels`). */
export interface CropArea {
  x: number;
  y: number;
  width: number;
  height: number;
}

/** Side of the saved character picture: enough for tokens and avatars, small to upload. */
export const CROP_OUTPUT_SIZE = 512;

/** Output side: the crop itself when smaller than the limit (never upscale), else the limit. */
export const cropOutputSize = (area: CropArea, max = CROP_OUTPUT_SIZE): number =>
  Math.max(1, Math.round(Math.min(max, area.width, area.height)));

const loadImage = (src: string): Promise<HTMLImageElement> => new Promise((resolve, reject) => {
  const image = new Image();
  image.onload = () => resolve(image);
  image.onerror = () => reject(new Error('image load failed'));
  image.src = src;
});

/**
 * Draws the crop area of `src` into a square canvas and returns it as a File ready for
 * `imageService.upload`: WebP when the browser can encode it, PNG otherwise (both accepted by the API).
 */
export const cropToFile = async (src: string, area: CropArea, max = CROP_OUTPUT_SIZE): Promise<File> => {
  const image = await loadImage(src);
  const size = cropOutputSize(area, max);
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const context = canvas.getContext('2d');
  if (!context) throw new Error('canvas not supported');
  context.imageSmoothingQuality = 'high';
  context.drawImage(image, area.x, area.y, area.width, area.height, 0, 0, size, size);

  const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/webp', 0.9));
  if (!blob) throw new Error('crop failed');
  // Browsers without WebP encoding silently return PNG.
  const extension = blob.type === 'image/webp' ? 'webp' : 'png';
  return new File([blob], `character.${extension}`, { type: blob.type });
};
