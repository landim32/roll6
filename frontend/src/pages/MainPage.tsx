import { useEffect, useState } from 'react';
import { GridSizeFooter } from '../components/map/GridSizeFooter';
import { MapCanvas } from '../components/map/MapCanvas';
import { MapControls } from '../components/map/MapControls';
import { PartyPanel } from '../components/map/PartyPanel';
import { TopMenu } from '../components/menu/TopMenu';
import { CampaignModal } from '../components/modals/CampaignModal';
import { CharacterFormModal } from '../components/modals/CharacterFormModal';
import { GridSizeModal } from '../components/modals/GridSizeModal';
import { ImageModal } from '../components/modals/ImageModal';
import { MapModal } from '../components/modals/MapModal';
import { SaveMapModal } from '../components/modals/SaveMapModal';
import { UnsavedChangesModal } from '../components/modals/UnsavedChangesModal';
import { useMapEditor } from '../hooks/useMapEditor';
import { useUnsavedGuard } from '../hooks/useUnsavedGuard';
import type { CampaignCharacterInfo } from '../types/campaignCharacter';

/** Main screen: always the map with the grid; every other window opens as a modal over it. */
export const MainPage = () => {
  const { isDirty, draft } = useMapEditor();
  const { guard, requestSave, saveModalProps, unsavedModalProps } = useUnsavedGuard();
  const [campaignOpen, setCampaignOpen] = useState(false);
  const [mapOpen, setMapOpen] = useState(false);
  const [imageOpen, setImageOpen] = useState(false);
  const [gridOpen, setGridOpen] = useState(false);
  /** Party card being edited (character form in edit mode). */
  const [editing, setEditing] = useState<CampaignCharacterInfo | null>(null);

  // Closing or reloading the tab with unsaved changes asks the browser to confirm.
  useEffect(() => {
    if (!isDirty) return;
    const onBeforeUnload = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = '';
    };
    window.addEventListener('beforeunload', onBeforeUnload);
    return () => window.removeEventListener('beforeunload', onBeforeUnload);
  }, [isDirty]);

  // With no image yet there is nothing to replace, so image+ opens without the unsaved guard.
  const openImage = async () => {
    if (!draft.image || (await guard())) setImageOpen(true);
  };

  return (
    <div className="stm-main">
      <MapCanvas />
      <TopMenu
        onOpenCampaign={() => setCampaignOpen(true)}
        onOpenMap={() => setMapOpen(true)}
        onSave={() => { void requestSave(); }}
        guard={guard}
      />
      <PartyPanel onEdit={setEditing} />
      <MapControls onOpenImage={openImage} />
      <GridSizeFooter onEditGrid={() => setGridOpen(true)} />

      <CampaignModal open={campaignOpen} onOpenChange={setCampaignOpen} />
      <MapModal open={mapOpen} onOpenChange={setMapOpen} guard={guard} />
      <ImageModal open={imageOpen} onOpenChange={setImageOpen} />
      <GridSizeModal open={gridOpen} onOpenChange={setGridOpen} />
      <SaveMapModal {...saveModalProps} />
      <UnsavedChangesModal {...unsavedModalProps} />
      <CharacterFormModal
        open={editing !== null}
        onOpenChange={(o) => { if (!o) setEditing(null); }}
        editing={editing && { characterId: editing.characterId, participation: editing }}
      />
    </div>
  );
};

export default MainPage;
