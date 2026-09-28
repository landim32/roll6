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
  /** Degrees, clockwise; the area is measured on the rotated image (pass it to cropToFile). */
  rotation: number;
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
  /** Crop guide: round (character pictures) or square (token images). The saved crop is always square. */
  shape?: 'round' | 'square';
  /** Shows the rotation controls (90° buttons + fine slider). */
  rotatable?: boolean;
  /** Help text under the cropper (defaults to the character picture hint). */
  hint?: string;
  /**
   * Compact picker: the picture (or its initial) with icon buttons "Trocar imagem" / "Remover imagem" instead of the
   * file input, so it fits next to another field; the cropper still opens full size once a file is chosen.
   */
  compact?: boolean;
  /** Called when the cropper opens (a file was chosen) or closes, e.g. to give it the full width. */
  onCroppingChange?: (cropping: boolean) => void;
}

const ImageIcon = () => (
  <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true">
    <path d="M6.002 5.5a1.5 1.5 0 1 1-3 0 1.5 1.5 0 0 1 3 0" />
    <path d="M2.002 1a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V3a2 2 0 0 0-2-2zm12 1a1 1 0 0 1 1 1v6.5l-3.777-1.947a.5.5 0 0 0-.577.093l-3.71 3.71-2.66-1.772a.5.5 0 0 0-.63.062L1.002 12V3a1 1 0 0 1 1-1z" />
  </svg>
);

const TrashIcon = () => (
  <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true">
    <path d="M5.5 5.5A.5.5 0 0 1 6 6v6a.5.5 0 0 1-1 0V6a.5.5 0 0 1 .5-.5m2.5 0a.5.5 0 0 1 .5.5v6a.5.5 0 0 1-1 0V6a.5.5 0 0 1 .5-.5m3 .5a.5.5 0 0 0-1 0v6a.5.5 0 0 0 1 0z" />
    <path d="M14.5 3a1 1 0 0 1-1 1H13v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V4h-.5a1 1 0 0 1-1-1V2a1 1 0 0 1 1-1H6a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1h3.5a1 1 0 0 1 1 1zM4.118 4 4 4.059V13a1 1 0 0 0 1 1h6a1 1 0 0 0 1-1V4.059L11.882 4zM2.5 3h11V2h-11z" />
  </svg>
);

/** Below 1 the image shrinks inside the frame; the uncovered part is saved transparent. */
const MIN_ZOOM = 0.2;
const START_ZOOM = 1;
const MAX_ZOOM = 4;
const MAX_ROTATION = 180;

/** Keeps the angle within −180…180 after the 90° buttons. */
const normalizeRotation = (degrees: number): number => {
  const turned = ((degrees + MAX_ROTATION) % 360 + 360) % 360 - MAX_ROTATION;
  return turned === -MAX_ROTATION ? MAX_ROTATION : turned;
};

/**
 * File picker + square crop with a round (character pictures) or square (token images) guide, zoom by
 * slider or wheel and, when `rotatable`, rotation by 90° buttons or a slider. In
 * edit mode the saved picture is shown with "Trocar imagem" / "Remover imagem" until a new file is chosen.
 */
export const ImageCropper = ({
  id, onChange, hasCurrent = false, currentUrl, currentName = '', onRemoveCurrent, shape = 'round', rotatable = false, hint,
  compact = false, onCroppingChange,
}: ImageCropperProps) => {
  const { t } = useTranslation();
  const input = useRef<HTMLInputElement>(null);
  const [src, setSrc] = useState<string | null>(null);
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(START_ZOOM);
  const [rotation, setRotation] = useState(0);

  // The object URL lives while this image is being cropped.
  useEffect(() => () => { if (src) URL.revokeObjectURL(src); }, [src]);

  const choose = (file: File | undefined) => {
    if (!file) return;
    if (!ACCEPTED_IMAGE_TYPES.includes(file.type)) return toast.error(t('image.invalidType'));
    if (file.size > MAX_IMAGE_BYTES) return toast.error(t('image.tooLarge'));
    setCrop({ x: 0, y: 0 });
    setZoom(START_ZOOM);
    setRotation(0);
    setSrc(URL.createObjectURL(file));
    onCroppingChange?.(true);
  };

  const clear = () => {
    setSrc(null);
    onChange(null);
    onCroppingChange?.(false);
  };

  const onCropComplete = useCallback((_: Area, pixels: Area) => {
    if (src) onChange({ src, area: pixels, rotation });
  }, [src, rotation, onChange]);

  const showCurrent = !src && hasCurrent;
  const pickLabel = t(hasCurrent ? 'characterForm.changeImage' : 'characterForm.chooseImage');

  return (
    <div>
      <input ref={input} id={id} type="file" className="form-control" accept={ACCEPTED_IMAGE_TYPES.join(',')} hidden={showCurrent || compact}
        onChange={(e) => { choose(e.target.files?.[0]); e.target.value = ''; }} />
      {compact && !src && (
        <div className="d-flex align-items-center gap-2">
          <CharacterAvatar name={currentName} imageUrl={hasCurrent ? currentUrl : null} size={64} />
          <div className="d-flex flex-column gap-1">
            <button type="button" className="btn btn-sm btn-outline-primary" aria-label={pickLabel} title={pickLabel}
              onClick={() => input.current?.click()}>
              <ImageIcon />
            </button>
            {hasCurrent && onRemoveCurrent && (
              <button type="button" className="btn btn-sm btn-outline-danger" aria-label={t('characterForm.removeImage')}
                title={t('characterForm.removeImage')} onClick={onRemoveCurrent}>
                <TrashIcon />
              </button>
            )}
          </div>
        </div>
      )}
      {showCurrent && !compact && (
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
              rotation={rotation}
              minZoom={MIN_ZOOM}
              restrictPosition={false}
              maxZoom={MAX_ZOOM}
              aspect={1}
              cropShape={shape === 'square' ? 'rect' : 'round'}
              showGrid={shape === 'square'}
              onCropChange={setCrop}
              onZoomChange={setZoom}
              onRotationChange={rotatable ? setRotation : undefined}
              onCropComplete={onCropComplete}
            />
          </div>
          <div className="d-flex align-items-center gap-2 mt-2">
            <label className="form-label mb-0 small" htmlFor={`${id}-zoom`}>{t('characterForm.zoom')}</label>
            <input id={`${id}-zoom`} type="range" className="form-range flex-grow-1" min={MIN_ZOOM} max={MAX_ZOOM} step={0.05}
              value={zoom} onChange={(e) => setZoom(Number(e.target.value))} />
            <button type="button" className="btn btn-sm btn-outline-secondary text-nowrap" onClick={clear}>{t('characterForm.removeImage')}</button>
          </div>
          {rotatable && (
            <div className="d-flex align-items-center gap-2 mt-2">
              <label className="form-label mb-0 small" htmlFor={`${id}-rotation`}>{t('image.rotation')}</label>
              <button type="button" className="btn btn-sm btn-outline-secondary" aria-label={t('image.rotateLeft')} title={t('image.rotateLeft')}
                onClick={() => setRotation((r) => normalizeRotation(r - 90))}>↺</button>
              <input id={`${id}-rotation`} type="range" className="form-range flex-grow-1" min={-MAX_ROTATION} max={MAX_ROTATION} step={1}
                value={rotation} onChange={(e) => setRotation(Number(e.target.value))} />
              <button type="button" className="btn btn-sm btn-outline-secondary" aria-label={t('image.rotateRight')} title={t('image.rotateRight')}
                onClick={() => setRotation((r) => normalizeRotation(r + 90))}>↻</button>
              <small className="text-body-secondary text-nowrap" style={{ minWidth: '3.5em' }}>{rotation}°</small>
            </div>
          )}
          <div className="form-text">{hint ?? t('characterForm.cropHint')}</div>
        </>
      )}
    </div>
  );
};

export default ImageCropper;
