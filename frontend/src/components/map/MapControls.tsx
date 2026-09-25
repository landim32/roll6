import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { MAX_ZOOM, MIN_ZOOM } from '../../Contexts/MapEditorContext';
import { useMapEditor } from '../../hooks/useMapEditor';

interface MapControlsProps {
  onOpenImage: () => void;
}

/** Buttons at the bottom-right corner: zoom in/out, image+ and image resize mode. */
export const MapControls = ({ onOpenImage }: MapControlsProps) => {
  const { t } = useTranslation();
  const { view, zoomIn, zoomOut, resizeMode, toggleResizeMode, canEdit, draft } = useMapEditor();

  const center = (): [number, number] => [window.innerWidth / 2, window.innerHeight / 2];

  const onToggleResize = () => {
    if (!draft.imageUrl) {
      toast.info(t('image.noImage'));
      return;
    }
    toggleResizeMode();
    toast.info(t(resizeMode ? 'toast.resizeOff' : 'toast.resizeOn'));
  };

  return (
    <div className="stm-controls">
      <button type="button" className="btn btn-secondary" title={t('map.zoomIn')} aria-label={t('map.zoomIn')}
        disabled={view.zoom >= MAX_ZOOM} onClick={() => zoomIn(...center())}>+</button>
      <button type="button" className="btn btn-secondary" title={t('map.zoomOut')} aria-label={t('map.zoomOut')}
        disabled={view.zoom <= MIN_ZOOM} onClick={() => zoomOut(...center())}>−</button>
      <button type="button" className="btn btn-secondary" title={t('map.image')} aria-label={t('map.image')}
        disabled={!canEdit} onClick={onOpenImage}>🖼+</button>
      <button type="button" className={`btn ${resizeMode ? 'btn-warning' : 'btn-secondary'}`} title={t('map.resize')}
        aria-label={t('map.resize')} aria-pressed={resizeMode} disabled={!canEdit} onClick={onToggleResize}>⤡</button>
    </div>
  );
};

export default MapControls;
