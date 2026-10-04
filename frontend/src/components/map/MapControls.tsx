import { useRef, useState } from 'react';
import type { ChangeEvent } from 'react';
import * as DropdownMenu from '@radix-ui/react-dropdown-menu';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { MAX_ZOOM, MIN_ZOOM } from '../../Contexts/MapEditorContext';
import { useCampaign } from '../../hooks/useCampaign';
import { useMapEditor } from '../../hooks/useMapEditor';
import { useMapShare } from '../../hooks/useMapShare';
import { isStoryMap } from '../../lib/draft';
import { FOV_MAX, FOV_MIN, FOV_STEP } from '../../lib/storyCamera';
import { ACCEPTED_IMAGE_TYPES, imageService, MAX_IMAGE_BYTES } from '../../Services/imageService';
import { MAP_KIND } from '../../types/mapModel';
import {
  BoxIcon, BricksIcon, ImageIcon, MapIcon, MinusIcon, PlusIcon, ResizeIcon, ShareIcon, View3dIcon,
} from '../ui/icons';
import { DiceRoller } from './DiceRoller';

interface MapControlsProps {
  onOpenImage: () => void;
}

/**
 * Buttons at the bottom-right corner: zoom in/out, dice, share, scene image and image resize mode. Story maps (033)
 * add the 2D/3D switch (everyone) and, for whoever can save the map, the story menu (kind, walls, sky).
 */
export const MapControls = ({ onOpenImage }: MapControlsProps) => {
  const { t } = useTranslation();
  const { currentCampaign } = useCampaign();
  const {
    view, zoomIn, zoomOut, resizeMode, toggleResizeMode, canEdit, draft,
    setKind, wallMode, setWallMode, setSkyImage, viewMode, setViewMode, fov, setFov,
  } = useMapEditor();
  const { share, sharing } = useMapShare();
  const skyInput = useRef<HTMLInputElement>(null);
  const [uploadingSky, setUploadingSky] = useState(false);
  const canShare = draft.mapId !== null && currentCampaign !== null;
  const story = isStoryMap(draft);
  const in3d = viewMode === '3d';

  const center = (): [number, number] => [window.innerWidth / 2, window.innerHeight / 2];

  const onToggleResize = () => {
    if (!draft.imageUrl) {
      toast.info(t('image.noImage'));
      return;
    }
    toggleResizeMode();
    toast.info(t(resizeMode ? 'toast.resizeOff' : 'toast.resizeOn'));
  };

  const onSkyChosen = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    if (!ACCEPTED_IMAGE_TYPES.includes(file.type)) {
      toast.error(t('image.invalidType'));
      return;
    }
    if (file.size > MAX_IMAGE_BYTES) {
      toast.error(t('image.tooLarge'));
      return;
    }
    try {
      setUploadingSky(true);
      const uploaded = await imageService.upload(file);
      setSkyImage(uploaded.fileName, uploaded.url);
      toast.success(t('story.skySet'));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t('common.unknownError'));
    } finally {
      setUploadingSky(false);
    }
  };

  // In 3D the zoom buttons narrow/widen the field of view (a smaller angle = closer).
  const zoomInButton = in3d
    ? { disabled: fov <= FOV_MIN, onClick: () => setFov(fov - FOV_STEP) }
    : { disabled: view.zoom >= MAX_ZOOM, onClick: () => zoomIn(...center()) };
  const zoomOutButton = in3d
    ? { disabled: fov >= FOV_MAX, onClick: () => setFov(fov + FOV_STEP) }
    : { disabled: view.zoom <= MIN_ZOOM, onClick: () => zoomOut(...center()) };

  return (
    <div className="stm-controls">
      <button type="button" className="btn btn-secondary" title={t('map.zoomIn')} aria-label={t('map.zoomIn')}
        disabled={zoomInButton.disabled} onClick={zoomInButton.onClick}><PlusIcon size={20} /></button>
      <button type="button" className="btn btn-secondary" title={t('map.zoomOut')} aria-label={t('map.zoomOut')}
        disabled={zoomOutButton.disabled} onClick={zoomOutButton.onClick}><MinusIcon size={20} /></button>
      {/* 3d6 on this screen only: it reads no campaign and stores nothing. */}
      <DiceRoller />
      {canShare && (
        <button type="button" className="btn btn-secondary" title={t('map.share')} aria-label={t('map.share')}
          aria-busy={sharing} disabled={sharing} onClick={() => { void share(); }}>
          {sharing ? <span className="spinner-border spinner-border-sm" role="status" /> : <ShareIcon size={20} />}
        </button>
      )}
      {story && (
        <button type="button" className={`btn ${in3d ? 'btn-info' : 'btn-secondary'}`}
          title={t(in3d ? 'story.view2d' : 'story.view3d')} aria-label={t(in3d ? 'story.view2d' : 'story.view3d')}
          aria-pressed={in3d} onClick={() => setViewMode(in3d ? '2d' : '3d')}>
          {in3d ? <MapIcon size={20} /> : <View3dIcon size={20} />}
        </button>
      )}
      {!in3d && (
        <>
          {/* Editing the map (image, kind, walls, sky) is not done on phones. */}
          <DropdownMenu.Root modal={false}>
            <DropdownMenu.Trigger asChild>
              <button type="button" className={`btn d-none d-md-inline-flex ${wallMode ? 'btn-warning' : 'btn-secondary'}`}
                title={t('story.menu')} aria-label={t('story.menu')} disabled={!canEdit}>
                {story ? <BricksIcon size={20} /> : <BoxIcon size={20} />}
              </button>
            </DropdownMenu.Trigger>
            <DropdownMenu.Portal>
              <DropdownMenu.Content className="dropdown-menu show" side="left" align="end" sideOffset={6}>
                <DropdownMenu.Label className="dropdown-header">{t('story.kind')}</DropdownMenu.Label>
                <DropdownMenu.RadioGroup value={String(draft.kind)} onValueChange={(value) => setKind(Number(value))}>
                  <DropdownMenu.RadioItem className={`dropdown-item${!story ? ' active' : ''}`} value={String(MAP_KIND.battle)}>
                    {t('story.kindBattle')}
                  </DropdownMenu.RadioItem>
                  <DropdownMenu.RadioItem className={`dropdown-item${story ? ' active' : ''}`} value={String(MAP_KIND.story)}>
                    {t('story.kindStory')}
                  </DropdownMenu.RadioItem>
                </DropdownMenu.RadioGroup>
                {story && (
                  <>
                    <DropdownMenu.Separator className="dropdown-divider" />
                    <DropdownMenu.Label className="dropdown-header">{t('story.walls')}</DropdownMenu.Label>
                    <DropdownMenu.RadioGroup value={wallMode ?? 'off'}
                      onValueChange={(value) => setWallMode(value === 'off' ? null : (value as 'paint' | 'erase'))}>
                      <DropdownMenu.RadioItem className={`dropdown-item${wallMode === 'paint' ? ' active' : ''}`} value="paint">
                        {t('story.paint')}
                      </DropdownMenu.RadioItem>
                      <DropdownMenu.RadioItem className={`dropdown-item${wallMode === 'erase' ? ' active' : ''}`} value="erase">
                        {t('story.erase')}
                      </DropdownMenu.RadioItem>
                      <DropdownMenu.RadioItem className={`dropdown-item${wallMode === null ? ' active' : ''}`} value="off">
                        {t('story.wallsOff')}
                      </DropdownMenu.RadioItem>
                    </DropdownMenu.RadioGroup>
                    <DropdownMenu.Separator className="dropdown-divider" />
                    <DropdownMenu.Label className="dropdown-header">{t('story.sky')}</DropdownMenu.Label>
                    <DropdownMenu.Item className="dropdown-item" disabled={uploadingSky}
                      onSelect={() => skyInput.current?.click()}>
                      {t(uploadingSky ? 'story.skyUploading' : 'story.skyUpload')}
                    </DropdownMenu.Item>
                    {draft.skyImage && (
                      <DropdownMenu.Item className="dropdown-item" onSelect={() => setSkyImage(null, null)}>
                        {t('story.skyRemove')}
                      </DropdownMenu.Item>
                    )}
                  </>
                )}
              </DropdownMenu.Content>
            </DropdownMenu.Portal>
          </DropdownMenu.Root>
          <input ref={skyInput} type="file" accept={ACCEPTED_IMAGE_TYPES.join(',')} hidden
            onChange={(event) => { void onSkyChosen(event); }} />
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
