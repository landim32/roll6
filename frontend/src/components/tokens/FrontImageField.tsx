import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { ACCEPTED_IMAGE_TYPES, MAX_IMAGE_BYTES } from '../../Services/imageService';
import { TrashIcon } from '../ui/icons';

interface FrontImageFieldProps {
  id: string;
  /** Called with the chosen file, or null when it is cleared. */
  onChange: (file: File | null) => void;
  /** Edit: a saved image is shown until a new one is chosen or it is removed. */
  hasCurrent?: boolean;
  currentUrl?: string | null;
  /** Edit: removes the saved image. */
  onRemoveCurrent?: () => void;
}

/**
 * The token's optional "2,5D frente" image (034): the figure seen from the front, standing, drawn by the 3D view. The
 * file is uploaded as it is — no crop, so a PNG keeps its transparent background — and shown over a checkerboard.
 */
export const FrontImageField = ({ id, onChange, hasCurrent = false, currentUrl = null, onRemoveCurrent }: FrontImageFieldProps) => {
  const { t } = useTranslation();
  const input = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<string | null>(null);

  // The preview URL lives while that file is chosen.
  useEffect(() => () => { if (preview) URL.revokeObjectURL(preview); }, [preview]);

  const choose = (file: File | undefined) => {
    if (!file) return;
    if (!ACCEPTED_IMAGE_TYPES.includes(file.type)) {
      toast.error(t('image.invalidType'));
      return;
    }
    if (file.size > MAX_IMAGE_BYTES) {
      toast.error(t('image.tooLarge'));
      return;
    }
    setPreview(URL.createObjectURL(file));
    onChange(file);
  };

  const clear = () => {
    setPreview(null);
    onChange(null);
    if (input.current) input.current.value = '';
  };

  const shown = preview ?? (hasCurrent ? currentUrl : null);
  const removable = preview !== null || (hasCurrent && onRemoveCurrent !== undefined);

  return (
    <div className="stm-front-field">
      <input ref={input} id={id} type="file" className="form-control" accept={ACCEPTED_IMAGE_TYPES.join(',')}
        onChange={(event) => choose(event.target.files?.[0])} />
      <div className="form-text">{t('tokens.frontImageHint')}</div>
      {shown && (
        <div className="d-flex align-items-start gap-2 mt-2">
          <img className="stm-front-preview" src={shown} alt={t('tokens.frontImage')} />
          {removable && (
            <button type="button" className="btn btn-sm btn-outline-danger" title={t('tokens.frontImageRemove')}
              aria-label={t('tokens.frontImageRemove')} onClick={preview !== null ? clear : onRemoveCurrent}>
              <TrashIcon size={14} />
            </button>
          )}
        </div>
      )}
    </div>
  );
};

export default FrontImageField;
