import { useTranslation } from 'react-i18next';
import { ImageCropper } from '../ui/ImageCropper';
import type { ImageCrop } from '../ui/ImageCropper';
import { FRONT_IMAGE_ASPECT, FRONT_IMAGE_SIZE, silhouetteCropStyle } from '../../lib/frontImage';
import type { SpriteView } from '../../lib/spriteView';

interface SpriteImageFieldProps {
  id: string;
  /** Which of the four sides of the figure this field edits (035). */
  view: SpriteView;
  /** Called with the crop, or null when no image is chosen. The form saves it at `FRONT_IMAGE_SIZE`. */
  onChange: (crop: ImageCrop | null) => void;
  /** Edit: a saved image is shown until a new one is chosen or it is removed. */
  hasCurrent?: boolean;
  currentUrl?: string | null;
  currentName?: string;
  /** Edit: removes the saved image. */
  onRemoveCurrent?: () => void;
}

/** Frame guide, built once: the human silhouette painted over the picture being cropped. */
const SILHOUETTE = silhouetteCropStyle();

/**
 * One of the four "2,5D" images of a token (035): the character standing, seen from one side, cropped to a 3:4 portrait
 * over the same human silhouette guide in all four — 60% of the frame's height, feet on the bottom edge. The label
 * names the side and the help under it says how to draw it, always visible (not only while cropping), so the user
 * knows which side the picture must show before choosing a file. Zooming out leaves a transparent margin: a smaller
 * character in the frame is a smaller figure in 3D.
 *
 * The four children are the rows of the field's subgrid (036): title · description · stage · controls. The stage — the
 * same square for the crop, the saved picture and the empty field — and the controls come from `ImageCropper` in
 * `stage` mode, so the four fields are the same size in every state and line up with each other.
 */
export const SpriteImageField = ({
  id, view, onChange, hasCurrent = false, currentUrl = null, currentName = '', onRemoveCurrent,
}: SpriteImageFieldProps) => {
  const { t } = useTranslation();

  return (
    <div className="stm-sprite-field">
      <label className="form-label" htmlFor={id}>{t(`tokens.view.${view}`)}</label>
      <div className="form-text stm-sprite-hint">{t(`tokens.viewHint.${view}`)}</div>
      <ImageCropper
        id={id}
        onChange={onChange}
        shape="square"
        aspect={FRONT_IMAGE_ASPECT}
        rotatable
        stage
        emptyLabel={t('tokens.stageEmpty')}
        cropAreaStyle={SILHOUETTE}
        hint={t('tokens.spriteCropHint', { width: FRONT_IMAGE_SIZE.width, height: FRONT_IMAGE_SIZE.height })}
        hasCurrent={hasCurrent}
        currentUrl={currentUrl}
        currentName={currentName}
        onRemoveCurrent={onRemoveCurrent}
      />
    </div>
  );
};

export default SpriteImageField;
