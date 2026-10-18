import { useTranslation } from 'react-i18next';
import { PREVIEW_ZOOM_MAX, PREVIEW_ZOOM_MIN, stepZoom } from '../../lib/previewZoom';
import { MinusIcon, PlusIcon } from './icons';

interface ZoomButtonsProps {
  zoom: number;
  onChange: (zoom: number) => void;
  className?: string;
}

/**
 * The "+" / "−" of a 3D preview (085), over the stage's corner: each press multiplies or divides the zoom by a step
 * (`lib/previewZoom`); disabled at the limits. The wheel and the pinch do the same on the canvas itself.
 */
export const ZoomButtons = ({ zoom, onChange, className = '' }: ZoomButtonsProps) => {
  const { t } = useTranslation();

  return (
    <div className={`stm-stage-zoom btn-group-vertical btn-group-sm ${className}`.trim()} role="group" aria-label={t('preview.zoom')}>
      <button type="button" className="btn btn-outline-secondary" disabled={zoom >= PREVIEW_ZOOM_MAX}
        title={t('preview.zoomIn')} aria-label={t('preview.zoomIn')} onClick={() => onChange(stepZoom(zoom, 1))}>
        <PlusIcon size={14} />
      </button>
      <button type="button" className="btn btn-outline-secondary" disabled={zoom <= PREVIEW_ZOOM_MIN}
        title={t('preview.zoomOut')} aria-label={t('preview.zoomOut')} onClick={() => onChange(stepZoom(zoom, -1))}>
        <MinusIcon size={14} />
      </button>
    </div>
  );
};

export default ZoomButtons;
