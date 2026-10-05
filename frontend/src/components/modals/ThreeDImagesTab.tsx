import { useState } from 'react';
import type { ChangeEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { useMapEditor } from '../../hooks/useMapEditor';
import { readFileImageSize } from '../../lib/imageSize';
import { formatRatio, sameRatio } from '../../lib/maskImage';
import { ACCEPTED_IMAGE_TYPES, imageService, MAX_IMAGE_BYTES } from '../../Services/imageService';
import { TrashIcon } from '../ui/icons';
import { MaskPreview } from './MaskPreview';

/**
 * The "3D" tab of the scene image window (034): the 3D mask (its tone is the height of the wall — black = tall,
 * white = empty, gray = lower — in the same proportion as the map image, shown here already in grays) and the
 * background of the 3D view and the texture that covers every wall (036). They only change the draft; the map saves them
 * with everything else.
 */
export const ThreeDImagesTab = () => {
  const { t } = useTranslation();
  const { draft, setMaskImage, setBackgroundImage, setWallTextureImage } = useMapEditor();
  const [sending, setSending] = useState<'mask' | 'background' | 'texture' | null>(null);

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
    const size = await readFileImageSize(file);
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

  const onWallTexture = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = validFile(event);
    if (!file) return;
    setSending('texture');
    try {
      const uploaded = await imageService.upload(file);
      setWallTextureImage(uploaded.fileName, uploaded.url);
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
            {draft.maskImageUrl && <MaskPreview url={draft.maskImageUrl} />}
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
      <div className="col-12 col-lg-6">
        <label className="form-label fw-semibold" htmlFor="wall-texture-file">{t('raycast.wallTexture')}</label>
        <input id="wall-texture-file" type="file" className="form-control" accept={ACCEPTED_IMAGE_TYPES.join(',')}
          disabled={sending !== null} onChange={(event) => { void onWallTexture(event); }} />
        <div className="form-text">{t('raycast.wallTextureHint')}</div>
        {draft.wallTextureImageUrl ? (
          <div className="mt-2">
            <img className="stm-mask-preview" src={draft.wallTextureImageUrl} alt={t('raycast.wallTexture')} />
            <div>
              <button type="button" className="btn btn-sm btn-outline-danger mt-2" onClick={() => setWallTextureImage(null, null)}>
                <TrashIcon size={14} /> {t('raycast.remove')}
              </button>
            </div>
          </div>
        ) : <div className="text-secondary small mt-2">{t('raycast.wallTextureNone')}</div>}
        {sending === 'texture' && <div className="text-secondary small mt-2">{t('raycast.sending')}</div>}
      </div>
    </div>
  );
};

export default ThreeDImagesTab;
