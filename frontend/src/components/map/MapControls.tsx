import { mapRegionCenter } from '../../lib/mapRegion';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { MAX_ZOOM, MIN_ZOOM } from '../../Contexts/MapEditorContext';
import { useCampaign } from '../../hooks/useCampaign';
import { useMapEditor } from '../../hooks/useMapEditor';
import { useMapShare } from '../../hooks/useMapShare';
import { FOV_MAX, FOV_MIN, FOV_STEP } from '../../lib/storyCamera';
import { ImageIcon, MapIcon, MinusIcon, PlusIcon, ResizeIcon, ShareIcon, View3dIcon } from '../ui/icons';
import { DiceRoller } from './DiceRoller';

interface MapControlsProps {
  onOpenImage: () => void;
}

/**
 * Buttons at the bottom-right corner: zoom in/out, dice, share, the 2D/3D switch (034, every map has the 3D view),
 * scene image and image resize mode. In 3D the zoom buttons change the field of view and the image buttons are hidden.
 */
export const MapControls = ({ onOpenImage }: MapControlsProps) => {
  const { t } = useTranslation();
  const { currentCampaign } = useCampaign();
  const { view, zoomIn, zoomOut, resizeMode, toggleResizeMode, canEdit, draft, viewMode, setViewMode, fov, setFov } = useMapEditor();
  const { share, sharing } = useMapShare();
  const canShare = draft.mapId !== null && currentCampaign !== null;

  const in3d = viewMode === '3d';

  const center = mapRegionCenter;

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
        disabled={in3d ? fov <= FOV_MIN : view.zoom >= MAX_ZOOM}
        onClick={() => (in3d ? setFov(fov - FOV_STEP) : zoomIn(...center()))}><PlusIcon size={20} /></button>
      <button type="button" className="btn btn-secondary" title={t('map.zoomOut')} aria-label={t('map.zoomOut')}
        disabled={in3d ? fov >= FOV_MAX : view.zoom <= MIN_ZOOM}
        onClick={() => (in3d ? setFov(fov + FOV_STEP) : zoomOut(...center()))}><MinusIcon size={20} /></button>
      {/* 3d6 on this screen only: it reads no campaign and stores nothing. */}
      <DiceRoller />
      {canShare && (
        <button type="button" className="btn btn-secondary" title={t('map.share')} aria-label={t('map.share')}
          aria-busy={sharing} disabled={sharing} onClick={() => { void share(); }}>
          {sharing ? <span className="spinner-border spinner-border-sm" role="status" /> : <ShareIcon size={20} />}
        </button>
      )}
      {/* Every map can be seen in 3D (034): the only button this feature adds. */}
      <button type="button" className={`btn ${in3d ? 'btn-info' : 'btn-secondary'}`}
        title={t(in3d ? 'story.view2d' : 'story.view3d')} aria-label={t(in3d ? 'story.view2d' : 'story.view3d')}
        aria-pressed={in3d} onClick={() => setViewMode(in3d ? '2d' : '3d')}>
        {in3d ? <MapIcon size={20} /> : <View3dIcon size={20} />}
      </button>
      {/* Editing the image is not done on phones, nor in 3D. */}
      {!in3d && (
        <>
          <button type="button" className="btn btn-secondary d-none d-md-inline-flex" title={t('map.image')} aria-label={t('map.image')}
            disabled={!canEdit} onClick={onOpenImage}><ImageIcon size={20} /></button>
          <button type="button" className={`btn d-none d-md-inline-flex ${resizeMode ? 'btn-warning' : 'btn-secondary'}`} title={t('map.resize')}
            aria-label={t('map.resize')} aria-pressed={resizeMode} disabled={!canEdit} onClick={onToggleResize}><ResizeIcon size={20} /></button>
        </>
      )}
    </div>
  );
};

export default MapControls;
