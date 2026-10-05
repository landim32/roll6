import { useCallback, useEffect, useRef, useState } from 'react';
import type { CSSProperties } from 'react';
import Cropper from 'react-easy-crop';
import type { Area } from 'react-easy-crop';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { CharacterAvatar } from './CharacterAvatar';
import { ACCEPTED_IMAGE_TYPES, MAX_IMAGE_BYTES } from '../../Services/imageService';
import type { CropArea } from '../../lib/cropImage';
import { ImageIcon, RotateRightIcon, TrashIcon, UndoIcon } from './icons';

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
  /** Crop guide: round (character pictures) or rectangular (token images). */
  shape?: 'round' | 'square';
  /** Width ÷ height of the crop. 1 keeps a square; token images follow the footprint. */
  aspect?: number;
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
  /** Style of the crop frame, e.g. a background guide (the "2,5D frente" silhouette). Only a guide: never saved. */
  cropAreaStyle?: CSSProperties;
  /**
   * Stage mode (036, the four "2,5D" fields): the crop, the saved picture and the empty field all show in one square
   * stage of a fixed size, with the crop frame centered in it, and the controls go under it in their own row — so the
   * fields look the same in every state. Without it the layout is the one the other forms have always used.
   */
  stage?: boolean;
  /** Stage mode: label of the button in an empty stage (defaults to "choose an image"). */
  emptyLabel?: string;
}

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
 * File picker + crop with a round (character pictures) or rectangular (token images) guide, zoom by
 * slider or wheel and, when `rotatable`, rotation by 90° buttons or a slider. Token images pass
 * `aspect` so the frame matches the footprint. In edit mode the saved picture is shown with
 * "Trocar imagem" / "Remover imagem" until a new file is chosen.
 */
export const ImageCropper = ({
  id, onChange, hasCurrent = false, currentUrl, currentName = '', onRemoveCurrent, shape = 'round', aspect = 1,
  rotatable = false, hint, compact = false, onCroppingChange, cropAreaStyle, stage = false, emptyLabel,
}: ImageCropperProps) => {
  const { t } = useTranslation();
  const input = useRef<HTMLInputElement>(null);
  const [src, setSrc] = useState<string | null>(null);
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(START_ZOOM);
  const [rotation, setRotation] = useState(0);
  // Stage mode: the stage's side in px. react-easy-crop sizes its frame from the picture being cropped (a wide image gets a
  // smaller frame than a tall one), so in the stage the frame is fixed to this measure and is identical in every field.
  const stageRef = useRef<HTMLDivElement>(null);
  const [stageSide, setStageSide] = useState(0);

  useEffect(() => {
    const element = stageRef.current;
    if (!stage || !element) return;
    const measure = () => setStageSide(Math.round(Math.min(element.clientWidth, element.clientHeight)));
    measure();
    // A hidden panel (the inactive tab) measures 0: it is measured again when it shows.
    const observer = new ResizeObserver(measure);
    observer.observe(element);
    return () => observer.disconnect();
  }, [stage]);

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
  const frameStyle: CSSProperties = (() => {
    const width = Math.min(1, aspect) * 100;
    return { left: `${(100 - width) / 2}%`, top: '0%', width: `${width}%`, height: '100%' };
  })();

  const fileInput = (
    <input ref={input} id={id} type="file" className="form-control" accept={ACCEPTED_IMAGE_TYPES.join(',')}
      hidden={showCurrent || compact || stage}
      onChange={(e) => { choose(e.target.files?.[0]); e.target.value = ''; }} />
  );

  // Frame as tall as the stage and `aspect` wide (a landscape aspect fills the width instead); undefined until measured.
  const fixedFrame = stage && stageSide > 0
    ? { width: Math.round(aspect >= 1 ? stageSide : stageSide * aspect), height: Math.round(aspect >= 1 ? stageSide / aspect : stageSide) }
    : undefined;

  const cropperPanel = (
    <div className={stage ? 'stm-cropper' : 'stm-cropper mt-2'}>
      <Cropper
        key={`${aspect}-${fixedFrame?.width ?? 0}`}
        image={src ?? ''}
        crop={crop}
        zoom={zoom}
        rotation={rotation}
        minZoom={MIN_ZOOM}
        restrictPosition={false}
        maxZoom={MAX_ZOOM}
        aspect={aspect}
        cropSize={fixedFrame}
        cropShape={shape === 'square' ? 'rect' : 'round'}
        showGrid={shape === 'square' && !cropAreaStyle}
        style={{ cropAreaStyle }}
        onCropChange={setCrop}
        onZoomChange={setZoom}
        onRotationChange={rotatable ? setRotation : undefined}
        onCropComplete={onCropComplete}
      />
    </div>
  );

  const zoomRow = (
    <div className="d-flex align-items-center gap-2 mt-2">
      <label className="form-label mb-0 small" htmlFor={`${id}-zoom`}>{t('characterForm.zoom')}</label>
      <input id={`${id}-zoom`} type="range" className="form-range flex-grow-1" min={MIN_ZOOM} max={MAX_ZOOM} step={0.05}
        value={zoom} onChange={(e) => setZoom(Number(e.target.value))} />
      <button type="button" className="btn btn-sm btn-outline-secondary text-nowrap" onClick={clear}>{t('characterForm.removeImage')}</button>
    </div>
  );

  const rotationRow = rotatable && (
    <div className="d-flex align-items-center gap-2 mt-2">
      <label className="form-label mb-0 small" htmlFor={`${id}-rotation`}>{t('image.rotation')}</label>
      <button type="button" className="btn btn-sm btn-outline-secondary" aria-label={t('image.rotateLeft')} title={t('image.rotateLeft')}
        onClick={() => setRotation((r) => normalizeRotation(r - 90))}><UndoIcon size={14} /></button>
      <input id={`${id}-rotation`} type="range" className="form-range flex-grow-1" min={-MAX_ROTATION} max={MAX_ROTATION} step={1}
        value={rotation} onChange={(e) => setRotation(Number(e.target.value))} />
      <button type="button" className="btn btn-sm btn-outline-secondary" aria-label={t('image.rotateRight')} title={t('image.rotateRight')}
        onClick={() => setRotation((r) => normalizeRotation(r + 90))}><RotateRightIcon size={14} /></button>
      <small className="text-body-secondary text-nowrap" style={{ minWidth: '3.5em' }}>{rotation}°</small>
    </div>
  );

  const hintRow = <div className="form-text">{hint ?? t('characterForm.cropHint')}</div>;

  const changeButton = (
    <button type="button" className="btn btn-sm btn-outline-primary" onClick={() => input.current?.click()}>{pickLabel}</button>
  );
  const removeButton = onRemoveCurrent && (
    <button type="button" className="btn btn-sm btn-outline-secondary" onClick={onRemoveCurrent}>{t('characterForm.removeImage')}</button>
  );

  // Stage mode: one square stage for the crop, the saved picture and the empty field, controls in their own row below.
  if (stage) {
    return (
      <>
        {fileInput}
        <div className="stm-stage" ref={stageRef}>
          {src
            ? cropperPanel
            : (
              <div className="stm-stage-frame" style={showCurrent ? frameStyle : { ...frameStyle, ...cropAreaStyle }}>
                {showCurrent
                  ? (currentUrl
                    ? <img src={currentUrl} alt={currentName} className="stm-stage-current" style={{ aspectRatio: aspect }} />
                    : <CharacterAvatar name={currentName} imageUrl={null} size={96} />)
                  : <button type="button" className="btn btn-sm btn-outline-primary" onClick={() => input.current?.click()}>{emptyLabel ?? t('characterForm.chooseImage')}</button>}
              </div>
            )}
        </div>
        <div className="stm-stage-controls">
          {src && (
            <>
              {zoomRow}
              {rotationRow}
              {hintRow}
            </>
          )}
          {showCurrent && <div className="d-flex align-items-center gap-2">{changeButton}{removeButton}</div>}
        </div>
      </>
    );
  }

  return (
    <div>
      {fileInput}
      {compact && !src && (
        <div className="d-flex align-items-center gap-2">
          <CharacterAvatar name={currentName} imageUrl={hasCurrent ? currentUrl : null} size={64} />
          <div className="d-flex flex-column gap-1">
            <button type="button" className="btn btn-sm btn-outline-primary" aria-label={pickLabel} title={pickLabel}
              onClick={() => input.current?.click()}>
              <ImageIcon size={14} />
            </button>
            {hasCurrent && onRemoveCurrent && (
              <button type="button" className="btn btn-sm btn-outline-danger" aria-label={t('characterForm.removeImage')}
                title={t('characterForm.removeImage')} onClick={onRemoveCurrent}>
                <TrashIcon size={14} />
              </button>
            )}
          </div>
        </div>
      )}
      {showCurrent && !compact && (
        <div className="d-flex align-items-center gap-3">
          {shape === 'square' && currentUrl ? (
            <img src={currentUrl} alt={currentName} className="stm-token-preview" style={{ aspectRatio: aspect }} />
          ) : (
            <CharacterAvatar name={currentName} imageUrl={currentUrl} size={96} />
          )}
          {changeButton}
          {removeButton}
        </div>
      )}
      {src && (
        <>
          {cropperPanel}
          {zoomRow}
          {rotationRow}
          {hintRow}
        </>
      )}
    </div>
  );
};

export default ImageCropper;
