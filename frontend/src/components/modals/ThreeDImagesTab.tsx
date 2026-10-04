import { useEffect, useRef, useState } from 'react';
import type { ChangeEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { useMapEditor } from '../../hooks/useMapEditor';
import { loadImage } from '../../lib/mapSnapshot';
import { formatRatio, sameRatio, thresholdPixels } from '../../lib/maskImage';
import { ACCEPTED_IMAGE_TYPES, imageService, MAX_IMAGE_BYTES } from '../../Services/imageService';
import { TrashIcon } from '../ui/icons';

/** Width (px) of the black-and-white preview of the mask. */
const PREVIEW_WIDTH = 320;

/** Natural size of a picked file (null when it is not a readable image). */
const fileSize = (file: File): Promise<{ width: number; height: number } | null> =>
  new Promise((resolve) => {
    const url = URL.createObjectURL(file);
    const image = new Image();
    image.onload = () => {
      URL.revokeObjectURL(url);
      resolve({ width: image.naturalWidth, height: image.naturalHeight });
    };
    image.onerror = () => {
      URL.revokeObjectURL(url);
      resolve(null);
    };
    image.src = url;
  });

/**
 * The "3D" tab of the scene image window (034): the 3D mask (black = wall, white = empty, the same proportion as the
 * map image, shown here already in black and white) and the background of the 3D view. Both only change the draft; the
 * map saves them with everything else.
 */
export const ThreeDImagesTab = () => {
  const { t } = useTranslation();
  const { draft, setMaskImage, setBackgroundImage } = useMapEditor();
  const preview = useRef<HTMLCanvasElement>(null);
  const [sending, setSending] = useState<'mask' | 'background' | null>(null);

  // The preview shows the mask as the 3D view reads it: pure black and white.
  const { maskImageUrl } = draft;
  useEffect(() => {
    const canvas = preview.current;
    if (!canvas || !maskImageUrl) return;
    let cancelled = false;
    void loadImage(maskImageUrl).then((image) => {
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
  }, [maskImageUrl]);

  /** Type and size checks shared by both pickers; returns the file or null (with the toast already shown). */
  const validFile = (event: ChangeEvent<HTMLInputElement>): File | null => {
    const file = event.target.files?.[0] ?? null;
    event.target.value = '';
    if (!file) return null;
    if (!ACCEPTED_IMAGE_TYPES.includes(file.type)) {
      toast.error(t('image.invalidType'));
      return null;
    }
    if (file.size > MAX_IMAGE_BYTES) {
      toast.error(t('image.tooLarge'));
      return null;
    }
    return file;
  };

  const onMask = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = validFile(event);
    if (!file) return;
    if (!draft.imageUrl || !draft.imageWidth || !draft.imageHeight) {
      toast.error(t('raycast.maskNeedsImage'));
      return;
    }
    const size = await fileSize(file);
    if (!size) {
      toast.error(t('image.invalidType'));
      return;
    }
    const map = { width: draft.imageWidth, height: draft.imageHeight };
    if (!sameRatio(size, map)) {
      toast.error(t('raycast.maskRatio', { mask: formatRatio(size), map: formatRatio(map) }));
      return;
    }
    setSending('mask');
    try {
      const uploaded = await imageService.upload(file);
      setMaskImage(uploaded.fileName, uploaded.url);
      toast.success(t('raycast.set'));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t('common.unknownError'));
    } finally {
      setSending(null);
    }
  };

  const onBackground = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = validFile(event);
    if (!file) return;
    setSending('background');
    try {
      const uploaded = await imageService.upload(file);
      setBackgroundImage(uploaded.fileName, uploaded.url);
      toast.success(t('raycast.set'));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t('common.unknownError'));
    } finally {
      setSending(null);
    }
  };

  return (
    <div className="row g-4">
      <div className="col-12 col-lg-6">
        <label className="form-label fw-semibold" htmlFor="mask-file">{t('raycast.mask')}</label>
        <input id="mask-file" type="file" className="form-control" accept={ACCEPTED_IMAGE_TYPES.join(',')}
          disabled={sending !== null} onChange={(event) => { void onMask(event); }} />
        <div className="form-text">{t('raycast.maskHint')}</div>
        {draft.maskImage ? (
          <div className="mt-2">
            <canvas ref={preview} className="stm-mask-preview" role="img" aria-label={t('raycast.maskPreview')} />
            <div>
              <button type="button" className="btn btn-sm btn-outline-danger mt-2" onClick={() => setMaskImage(null, null)}>
                <TrashIcon size={14} /> {t('raycast.remove')}
              </button>
            </div>
          </div>
        ) : <div className="text-secondary small mt-2">{t('raycast.none')}</div>}
        {sending === 'mask' && <div className="text-secondary small mt-2">{t('raycast.sending')}</div>}
      </div>
      <div className="col-12 col-lg-6">
        <label className="form-label fw-semibold" htmlFor="background-file">{t('raycast.background')}</label>
        <input id="background-file" type="file" className="form-control" accept={ACCEPTED_IMAGE_TYPES.join(',')}
          disabled={sending !== null} onChange={(event) => { void onBackground(event); }} />
        <div className="form-text">{t('raycast.backgroundHint')}</div>
        {draft.backgroundImageUrl ? (
          <div className="mt-2">
            <img className="stm-mask-preview" src={draft.backgroundImageUrl} alt={t('raycast.background')} />
            <div>
              <button type="button" className="btn btn-sm btn-outline-danger mt-2" onClick={() => setBackgroundImage(null, null)}>
                <TrashIcon size={14} /> {t('raycast.remove')}
              </button>
            </div>
          </div>
        ) : <div className="text-secondary small mt-2">{t('raycast.none')}</div>}
        {sending === 'background' && <div className="text-secondary small mt-2">{t('raycast.sending')}</div>}
      </div>
    </div>
  );
};

export default ThreeDImagesTab;
