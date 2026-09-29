import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { MAX_ZOOM, MIN_ZOOM } from '../../Contexts/MapEditorContext';
import { useCampaign } from '../../hooks/useCampaign';
import { useMapEditor } from '../../hooks/useMapEditor';
import { useMapShare } from '../../hooks/useMapShare';
import { ImageIcon, MinusIcon, PlusIcon, ResizeIcon, ShareIcon } from '../ui/icons';

interface MapControlsProps {
  onOpenImage: () => void;
}

/** Buttons at the bottom-right corner: zoom in/out, share, scene image and image resize mode. */
export const MapControls = ({ onOpenImage }: MapControlsProps) => {
  const { t } = useTranslation();
  const { currentCampaign } = useCampaign();
  const { view, zoomIn, zoomOut, resizeMode, toggleResizeMode, canEdit, draft } = useMapEditor();
  const { share, sharing } = useMapShare();
  const canShare = draft.mapId !== null && currentCampaign !== null;

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
        disabled={view.zoom >= MAX_ZOOM} onClick={() => zoomIn(...center())}><PlusIcon size={20} /></button>
      <button type="button" className="btn btn-secondary" title={t('map.zoomOut')} aria-label={t('map.zoomOut')}
        disabled={view.zoom <= MIN_ZOOM} onClick={() => zoomOut(...center())}><MinusIcon size={20} /></button>
      {canShare && (
        <button type="button" className="btn btn-secondary" title={t('map.share')} aria-label={t('map.share')}
          aria-busy={sharing} disabled={sharing} onClick={() => { void share(); }}>
          {sharing ? <span className="spinner-border spinner-border-sm" role="status" /> : <ShareIcon size={20} />}
        </button>
      )}
      {/* Editing the image is not done on phones. */}
      <button type="button" className="btn btn-secondary d-none d-md-inline-flex" title={t('map.image')} aria-label={t('map.image')}
        disabled={!canEdit} onClick={onOpenImage}><ImageIcon size={20} /></button>
      <button type="button" className={`btn d-none d-md-inline-flex ${resizeMode ? 'btn-warning' : 'btn-secondary'}`} title={t('map.resize')}
        aria-label={t('map.resize')} aria-pressed={resizeMode} disabled={!canEdit} onClick={onToggleResize}><ResizeIcon size={20} /></button>
    </div>
  );
};

export default MapControls;
