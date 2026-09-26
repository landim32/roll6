import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { GridSizeFooter } from '../components/map/GridSizeFooter';
import { MapCanvas } from '../components/map/MapCanvas';
import type { TokenPickRequest } from '../components/map/MapCanvas';
import { MapControls } from '../components/map/MapControls';
import { NpcPanel } from '../components/map/NpcPanel';
import { PartyPanel } from '../components/map/PartyPanel';
import { TopMenu } from '../components/menu/TopMenu';
import { CampaignModal } from '../components/modals/CampaignModal';
import { CharacterFormModal } from '../components/modals/CharacterFormModal';
import { GridSizeModal } from '../components/modals/GridSizeModal';
import { ImageModal } from '../components/modals/ImageModal';
import { MapModal } from '../components/modals/MapModal';
import { SaveMapModal } from '../components/modals/SaveMapModal';
import { NpcFormModal } from '../components/modals/NpcFormModal';
import { NpcPickerModal } from '../components/modals/NpcPickerModal';
import { TokenModal } from '../components/modals/TokenModal';
import { ConfirmModal } from '../components/ui/ConfirmModal';
import { UnsavedChangesModal } from '../components/modals/UnsavedChangesModal';
import { useMapEditor } from '../hooks/useMapEditor';
import { useMapToken } from '../hooks/useMapToken';
import { useUnsavedGuard } from '../hooks/useUnsavedGuard';
import type { CharacterEditTarget } from '../components/modals/CharacterFormModal';
import type { CampaignNpcInfo } from '../types/npc';
import type { TokenInfo } from '../types/token';

/** Main screen: always the map with the grid; every other window opens as a modal over it. */
export const MainPage = () => {
  const { isDirty, draft } = useMapEditor();
  const { guard, requestSave, saveModalProps, unsavedModalProps } = useUnsavedGuard();
  const [campaignOpen, setCampaignOpen] = useState(false);
  const [mapOpen, setMapOpen] = useState(false);
  const [imageOpen, setImageOpen] = useState(false);
  const [gridOpen, setGridOpen] = useState(false);
  /** Party card opened in the character form (edit or read-only, per mode). */
  const [editing, setEditing] = useState<CharacterEditTarget | null>(null);
  /** What the tokens modal was opened for from the map (hex menu or a character without a token). */
  const [tokenPick, setTokenPick] = useState<TokenPickRequest | null>(null);
  /** "Incluir NPC" window and the NPC whose pencil was clicked (014). */
  const [npcPickerOpen, setNpcPickerOpen] = useState(false);
  const [editingNpc, setEditingNpc] = useState<CampaignNpcInfo | null>(null);
  /** Piece waiting for the delete confirmation. */
  const [toDelete, setToDelete] = useState<{ mapTokenId: number; name: string } | null>(null);
  const { addToken, changeToken, placeCharacter, deleteToken } = useMapToken();
  const { t } = useTranslation();

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

  const onTokenChosen = async (token: TokenInfo) => {
    if (!tokenPick) return;
    switch (tokenPick.kind) {
      case 'add':
        await addToken(token, tokenPick.x, tokenPick.y);
        toast.success(t('toast.mapTokenAdded', { name: token.name }));
        break;
      case 'change':
        await changeToken(tokenPick.mapTokenId, token.tokenId);
        toast.success(t('toast.mapTokenChanged', { name: tokenPick.name }));
        break;
      case 'character':
        await placeCharacter(tokenPick.participation, tokenPick.x, tokenPick.y, token.tokenId);
        toast.success(t('toast.mapTokenAdded', { name: tokenPick.participation.characterName }));
        break;
    }
  };

  const onConfirmDelete = async () => {
    if (!toDelete) return;
    try {
      await deleteToken(toDelete.mapTokenId);
      toast.success(t('toast.mapTokenDeleted', { name: toDelete.name }));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t('common.unknownError'));
      throw err;
    }
  };

  const tokenPickTitle = tokenPick?.kind === 'character'
    ? t('mapTokens.chooseCharacterToken', { name: tokenPick.participation.characterName })
    : undefined;

  return (
    <div className="stm-main">
      <MapCanvas onPickToken={setTokenPick} onDeleteToken={setToDelete} picking={tokenPick !== null || toDelete !== null} />
      <TopMenu
        onOpenCampaign={() => setCampaignOpen(true)}
        onOpenMap={() => setMapOpen(true)}
        onSave={() => { void requestSave(); }}
        guard={guard}
      />
      <PartyPanel onOpen={(participation, mode) => setEditing({ participation, mode })} />
      <NpcPanel onAdd={() => setNpcPickerOpen(true)} onEdit={setEditingNpc} />
      <MapControls onOpenImage={openImage} />
      <GridSizeFooter onEditGrid={() => setGridOpen(true)} />

      <CampaignModal open={campaignOpen} onOpenChange={setCampaignOpen} />
      <MapModal open={mapOpen} onOpenChange={setMapOpen} guard={guard} />
      <ImageModal open={imageOpen} onOpenChange={setImageOpen} />
      <GridSizeModal open={gridOpen} onOpenChange={setGridOpen} />
      <SaveMapModal {...saveModalProps} />
      <UnsavedChangesModal {...unsavedModalProps} />
      <TokenModal
        open={tokenPick !== null}
        onOpenChange={(o) => { if (!o) setTokenPick(null); }}
        title={tokenPickTitle}
        onSelect={onTokenChosen}
      />
      <NpcPickerModal open={npcPickerOpen} onOpenChange={setNpcPickerOpen} />
      <NpcFormModal npc={editingNpc} onClose={() => setEditingNpc(null)} />
      <ConfirmModal
        open={toDelete !== null}
        onOpenChange={(o) => { if (!o) setToDelete(null); }}
        title={t('mapTokens.deleteTitle')}
        message={toDelete ? t('mapTokens.deleteMessage', { name: toDelete.name }) : ''}
        confirmLabel={t('hexMenu.deleteToken')}
        onConfirm={onConfirmDelete}
        danger
      />
      <CharacterFormModal
        open={editing !== null}
        onOpenChange={(o) => { if (!o) setEditing(null); }}
        editing={editing}
      />
    </div>
  );
};

export default MainPage;
