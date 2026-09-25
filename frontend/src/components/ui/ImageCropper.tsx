import { useCallback, useEffect, useRef, useState } from 'react';
import Cropper from 'react-easy-crop';
import type { Area } from 'react-easy-crop';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { CharacterAvatar } from './CharacterAvatar';
import { ACCEPTED_IMAGE_TYPES, MAX_IMAGE_BYTES } from '../../Services/imageService';
import type { CropArea } from '../../lib/cropImage';

/** Source image and the chosen area; the caller crops it (lib/cropImage) only when saving. */
export interface ImageCrop {
  src: string;
  area: CropArea;
}

interface ImageCropperProps {
  id: string;
  /** Called with the current crop, or null when no image is chosen. */
  onChange: (crop: ImageCrop | null) => void;
  /** A picture is already saved (edit mode): shown until a new file is chosen. */
  hasCurrent?: boolean;
  /** URL of the saved picture (may be missing: the initial is shown). */
  currentUrl?: string | null;
  /** Alt text / initial for the saved picture. */
  currentName?: string;
  /** Removes the saved picture (edit mode). */
  onRemoveCurrent?: () => void;
}

const MIN_ZOOM = 1;
const MAX_ZOOM = 4;

/**
 * File picker + square crop with a round guide (character pictures), zoom by slider or wheel. In
 * edit mode the saved picture is shown with "Trocar imagem" / "Remover imagem" until a new file is chosen.
 */
export const ImageCropper = ({ id, onChange, hasCurrent = false, currentUrl, currentName = '', onRemoveCurrent }: ImageCropperProps) => {
  const { t } = useTranslation();
  const input = useRef<HTMLInputElement>(null);
  const [src, setSrc] = useState<string | null>(null);
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(MIN_ZOOM);

  // The object URL lives while this image is being cropped.
  useEffect(() => () => { if (src) URL.revokeObjectURL(src); }, [src]);

  const choose = (file: File | undefined) => {
    if (!file) return;
    if (!ACCEPTED_IMAGE_TYPES.includes(file.type)) return toast.error(t('image.invalidType'));
    if (file.size > MAX_IMAGE_BYTES) return toast.error(t('image.tooLarge'));
    setCrop({ x: 0, y: 0 });
    setZoom(MIN_ZOOM);
    setSrc(URL.createObjectURL(file));
  };

  const clear = () => {
    setSrc(null);
    onChange(null);
  };

  const onCropComplete = useCallback((_: Area, pixels: Area) => {
    if (src) onChange({ src, area: pixels });
  }, [src, onChange]);

  const showCurrent = !src && hasCurrent;

  return (
    <div>
      <input ref={input} id={id} type="file" className="form-control" accept={ACCEPTED_IMAGE_TYPES.join(',')} hidden={showCurrent}
        onChange={(e) => { choose(e.target.files?.[0]); e.target.value = ''; }} />
      {showCurrent && (
        <div className="d-flex align-items-center gap-3">
          <CharacterAvatar name={currentName} imageUrl={currentUrl} size={96} />
          <button type="button" className="btn btn-sm btn-outline-primary" onClick={() => input.current?.click()}>{t('characterForm.changeImage')}</button>
          {onRemoveCurrent && (
            <button type="button" className="btn btn-sm btn-outline-secondary" onClick={onRemoveCurrent}>{t('characterForm.removeImage')}</button>
          )}
        </div>
      )}
      {src && (
        <>
          <div className="stm-cropper mt-2">
            <Cropper
              image={src}
              crop={crop}
              zoom={zoom}
              minZoom={MIN_ZOOM}
              maxZoom={MAX_ZOOM}
              aspect={1}
              cropShape="round"
              showGrid={false}
              onCropChange={setCrop}
              onZoomChange={setZoom}
              onCropComplete={onCropComplete}
            />
          </div>
          <div className="d-flex align-items-center gap-2 mt-2">
            <label className="form-label mb-0 small" htmlFor={`${id}-zoom`}>{t('characterForm.zoom')}</label>
            <input id={`${id}-zoom`} type="range" className="form-range flex-grow-1" min={MIN_ZOOM} max={MAX_ZOOM} step={0.05}
              value={zoom} onChange={(e) => setZoom(Number(e.target.value))} />
            <button type="button" className="btn btn-sm btn-outline-secondary text-nowrap" onClick={clear}>{t('characterForm.removeImage')}</button>
          </div>
          <div className="form-text">{t('characterForm.cropHint')}</div>
        </>
      )}
    </div>
  );
};

export default ImageCropper;
