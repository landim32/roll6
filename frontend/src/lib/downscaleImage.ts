/**
 * A PNG data URL no larger than `max` pixels on its longest side (095: marked versions of a generated map go to the
 * Codex at most 1600 px, so a request stays well under the hub's limit). Smaller images come back unchanged.
 */
export const downscaleImage = (dataUrl: string, max: number): Promise<string> => new Promise((resolve) => {
  const image = new Image();
  image.onload = () => {
    const scale = Math.min(1, max / Math.max(image.naturalWidth, image.naturalHeight));
    if (scale >= 1) {
      resolve(dataUrl);
      return;
    }
    const canvas = document.createElement('canvas');
    canvas.width = Math.max(1, Math.round(image.naturalWidth * scale));
    canvas.height = Math.max(1, Math.round(image.naturalHeight * scale));
    canvas.getContext('2d')?.drawImage(image, 0, 0, canvas.width, canvas.height);
    resolve(canvas.toDataURL('image/png'));
  };
  image.onerror = () => resolve(dataUrl);
  image.src = dataUrl;
});

/** The natural size of an image data URL (null when it does not load). */
export const imageSizeOf = (dataUrl: string): Promise<{ width: number; height: number } | null> => new Promise((resolve) => {
  const image = new Image();
  image.onload = () => resolve({ width: image.naturalWidth, height: image.naturalHeight });
  image.onerror = () => resolve(null);
  image.src = dataUrl;
});
