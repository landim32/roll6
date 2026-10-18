/** Side of the library cards' thumbnails (090), in pixels: square, sharp on a 4-column card at 2× pixels. */
export const THUMBNAIL_SIZE = 256;

/** A drawn canvas as the PNG that is uploaded and stored. */
export const canvasToPng = (canvas: HTMLCanvasElement): Promise<Blob> => new Promise((resolve, reject) => {
  canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new Error('no image'))), 'image/png');
});

