import type { ImageSize } from './maskImage';

/** Natural size of an image URL (null when it cannot be loaded). */
export const loadImageSize = (url: string): Promise<ImageSize | null> =>
  new Promise((resolve) => {
    const image = new Image();
    image.onload = () => resolve({ width: image.naturalWidth, height: image.naturalHeight });
    image.onerror = () => resolve(null);
    image.src = url;
  });

/** Natural size of a picked file (null when it is not a readable image). */
export const readFileImageSize = (file: File): Promise<ImageSize | null> => {
  const url = URL.createObjectURL(file);
  return loadImageSize(url).finally(() => URL.revokeObjectURL(url));
};
