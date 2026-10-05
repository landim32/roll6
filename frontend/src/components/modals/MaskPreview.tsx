import { useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { loadImage } from '../../lib/mapSnapshot';
import { thresholdPixels } from '../../lib/maskImage';

/** Width (px) of the black-and-white preview of the mask. */
const PREVIEW_WIDTH = 320;

interface MaskPreviewProps {
  /** Temporary URL of the mask image. */
  url: string;
}

/** The mask as the 3D view reads it: pure black (wall) and white (empty). */
export const MaskPreview = ({ url }: MaskPreviewProps) => {
  const { t } = useTranslation();
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    let cancelled = false;
    void loadImage(url).then((image) => {
      if (cancelled || !image || !canvas.isConnected) return;
      const width = PREVIEW_WIDTH;
      const height = Math.max(1, Math.round((image.naturalHeight / image.naturalWidth) * width));
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d', { willReadFrequently: true });
      if (!ctx) return;
      ctx.drawImage(image, 0, 0, width, height);
      try {
        const pixels = ctx.getImageData(0, 0, width, height);
        thresholdPixels(pixels.data);
        ctx.putImageData(pixels, 0, 0);
      } catch {
        // A picture the canvas cannot read stays as it is.
      }
    });
    return () => { cancelled = true; };
  }, [url]);

  return <canvas ref={canvasRef} className="stm-mask-preview" role="img" aria-label={t('raycast.maskPreview')} />;
};

export default MaskPreview;
