import * as DropdownMenu from '@radix-ui/react-dropdown-menu';
import { mapRegionCenter } from '../../lib/mapRegion';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { MAX_ZOOM, MIN_ZOOM } from '../../Contexts/MapEditorContext';
import { useCampaign } from '../../hooks/useCampaign';
import { canEditMap } from '../../lib/campaignStatus';
import { useMapEditor } from '../../hooks/useMapEditor';
import { useMapShare } from '../../hooks/useMapShare';
import { FOV_MAX, FOV_MIN, FOV_STEP } from '../../lib/storyCamera';
import { isThreeD } from '../../lib/viewMode';
import type { ViewMode } from '../../lib/viewMode';
import { CheckIcon, ImageIcon, IsoViewIcon, MapIcon, MinusIcon, PlusIcon, ResizeIcon, ShareIcon, View3dIcon } from '../ui/icons';

/** The views of the map (103): the 2D map, the isometric lit view and the first-person 3D view, now legacy (105). */
const VIEWS: readonly { mode: ViewMode; label: string; Icon: typeof MapIcon }[] = [
  { mode: '2d', label: 'story.view2dItem', Icon: MapIcon },
  { mode: 'iso', label: 'story.viewIso', Icon: IsoViewIcon },
  { mode: '3d', label: 'story.view3dItem', Icon: View3dIcon },
];

interface MapControlsProps {
  onOpenImage: () => void;
}

/**
 * Buttons at the bottom-right corner: zoom in/out, dice, share, the view chooser (034: every map has the 3D view; 103:
 * and the isometric one), scene image and image resize mode. In the 3D views the zoom buttons drive the view (field of
 * view, or the distance its handler registered) and the image buttons are hidden.
 */
export const MapControls = ({ onOpenImage }: MapControlsProps) => {
  const { t } = useTranslation();
  const { currentCampaign, isMaster } = useCampaign();
  const { view, zoomIn, zoomOut, resizeMode, toggleResizeMode, canEdit: canEditModel, draft, viewMode, setViewMode, fov, setFov, storyWalking, storyZoom } = useMapEditor();
  const { share, sharing } = useMapShare();
  const canShare = draft.mapId !== null && currentCampaign !== null;
  // 049: the open campaign map's picture stays as it is while the table is paused or finished.
  const frozen = draft.mapId !== null && draft.campaignId === currentCampaign?.campaignId
    && !canEditMap(currentCampaign?.status, isMaster);
  const canEdit = canEditModel && !frozen;

  const in3d = isThreeD(viewMode);
  const CurrentIcon = VIEWS.find((view) => view.mode === viewMode)?.Icon ?? MapIcon;

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
        disabled={in3d ? !storyWalking && fov <= FOV_MIN : view.zoom >= MAX_ZOOM}
        onClick={() => (in3d && storyWalking ? storyZoom(-1) : in3d ? setFov(fov - FOV_STEP) : zoomIn(...center()))}><PlusIcon size={20} /></button>
      <button type="button" className="btn btn-secondary" title={t('map.zoomOut')} aria-label={t('map.zoomOut')}
        disabled={in3d ? !storyWalking && fov >= FOV_MAX : view.zoom <= MIN_ZOOM}
        onClick={() => (in3d && storyWalking ? storyZoom(1) : in3d ? setFov(fov + FOV_STEP) : zoomOut(...center()))}><MinusIcon size={20} /></button>
      {/* 3d6 on this screen only: it reads no campaign and stores nothing. */}
      {canShare && (
        <button type="button" className="btn btn-secondary" title={t('map.share')} aria-label={t('map.share')}
          aria-busy={sharing} disabled={sharing} onClick={() => { void share(); }}>
          {sharing ? <span className="spinner-border spinner-border-sm" role="status" /> : <ShareIcon size={20} />}
        </button>
      )}
      {/* Every map can be seen in 3D (034) and, since 103, in the isometric lit view: one chooser for the three. */}
      <DropdownMenu.Root modal={false}>
        <DropdownMenu.Trigger asChild>
          <button type="button" className={`btn ${in3d ? 'btn-info' : 'btn-secondary'}`}
            title={t('story.viewChoose')} aria-label={t('story.viewChoose')}>
            <CurrentIcon size={20} />
          </button>
        </DropdownMenu.Trigger>
        <DropdownMenu.Portal>
          <DropdownMenu.Content className="dropdown-menu show stm-popper-menu" side="left" align="end" sideOffset={6}>
            <DropdownMenu.RadioGroup value={viewMode} onValueChange={(value) => setViewMode(value as ViewMode)}>
              {VIEWS.map(({ mode, label, Icon }) => (
                <DropdownMenu.RadioItem key={mode} value={mode}
                  className={`dropdown-item d-flex align-items-center gap-2${mode === viewMode ? ' active' : ''}`}>
                  <Icon size={16} />
                  <span className="flex-grow-1">{t(label)}</span>
                  <DropdownMenu.ItemIndicator><CheckIcon size={14} /></DropdownMenu.ItemIndicator>
                </DropdownMenu.RadioItem>
              ))}
            </DropdownMenu.RadioGroup>
          </DropdownMenu.Content>
        </DropdownMenu.Portal>
      </DropdownMenu.Root>
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
