/** Crop area in pixels of the source image (react-easy-crop's `croppedAreaPixels`). */
export interface CropArea {
  x: number;
  y: number;
  width: number;
  height: number;
}

/** Side of the saved character picture: enough for tokens and avatars, small to upload. */
export const CROP_OUTPUT_SIZE = 512;

/** Every token image is saved as a 240 × 240 square (011). */
export const TOKEN_IMAGE_SIZE = 240;

/** Output side: the crop itself when smaller than the limit (never upscale), else the limit. */
export const cropOutputSize = (area: CropArea, max = CROP_OUTPUT_SIZE): number =>
  Math.max(1, Math.round(Math.min(max, area.width, area.height)));

/**
 * Size of the box holding the image rotated by `rotation` degrees. react-easy-crop measures the crop
 * area inside this box, so the image is drawn rotated into it before cutting.
 */
export const rotatedBoundingBox = (width: number, height: number, rotation: number): { width: number; height: number } => {
  const radians = (rotation * Math.PI) / 180;
  const cos = Math.abs(Math.cos(radians));
  const sin = Math.abs(Math.sin(radians));
  return { width: cos * width + sin * height, height: sin * width + cos * height };
};

export interface CropOptions {
  /** Fixed output side (px), scaling up or down — used by token images. */
  exactSize?: number;
  /** Upper limit of the output side when `exactSize` is not given (never upscales). */
  maxSize?: number;
  /** Rotation (degrees, clockwise) chosen in the cropper. */
  rotation?: number;
  /** Base name of the file. */
  name?: string;
}

const loadImage = (src: string): Promise<HTMLImageElement> => new Promise((resolve, reject) => {
  const image = new Image();
  image.onload = () => resolve(image);
  image.onerror = () => reject(new Error('image load failed'));
  image.src = src;
});

/**
 * Draws the crop area of `src` (rotated as chosen; it may be larger than the image) into a square canvas
 * and returns it as a File ready for `imageService.upload`: WebP when the browser can encode it, PNG
 * otherwise (both accepted by the API, both keep the transparent margin).
 */
export const cropToFile = async (src: string, area: CropArea, options: CropOptions = {}): Promise<File> => {
  const { exactSize, maxSize = CROP_OUTPUT_SIZE, rotation = 0, name = 'character' } = options;
  const image = await loadImage(src);

  // The image rotated inside its bounding box, where the crop area was measured.
  const box = rotatedBoundingBox(image.naturalWidth, image.naturalHeight, rotation);
  const rotated = document.createElement('canvas');
  rotated.width = Math.round(box.width);
  rotated.height = Math.round(box.height);
  const rotatedContext = rotated.getContext('2d');
  if (!rotatedContext) throw new Error('canvas not supported');
  rotatedContext.translate(rotated.width / 2, rotated.height / 2);
  rotatedContext.rotate((rotation * Math.PI) / 180);
  rotatedContext.drawImage(image, -image.naturalWidth / 2, -image.naturalHeight / 2);

  const size = exactSize ?? cropOutputSize(area, maxSize);
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const context = canvas.getContext('2d');
  if (!context) throw new Error('canvas not supported');
  context.imageSmoothingQuality = 'high';
  // Scale the rotated image so the crop area fills the output. The area may reach outside the image
  // (zoomed out below 1): that part stays transparent.
  const scale = size / area.width;
  context.drawImage(rotated, -area.x * scale, -area.y * scale, rotated.width * scale, rotated.height * scale);

  const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/webp', 0.9));
  if (!blob) throw new Error('crop failed');
  // Browsers without WebP encoding silently return PNG.
  const extension = blob.type === 'image/webp' ? 'webp' : 'png';
  return new File([blob], `${name}.${extension}`, { type: blob.type });
};
