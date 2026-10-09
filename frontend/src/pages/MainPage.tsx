import { lazy, Suspense, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { GridSizeFooter } from '../components/map/GridSizeFooter';
import { MapCanvas } from '../components/map/MapCanvas';
import type { TokenPickRequest } from '../components/map/MapCanvas';
import { MapControls } from '../components/map/MapControls';
import { NpcPanel } from '../components/map/NpcPanel';
import { PartyPanel } from '../components/map/PartyPanel';
import { TopMenu } from '../components/menu/TopMenu';
import { ActModal } from '../components/modals/ActModal';
import { CampaignModal } from '../components/modals/CampaignModal';
import { CampaignCharacterModal } from '../components/modals/CampaignCharacterModal';
import { GridSizeModal } from '../components/modals/GridSizeModal';
import { ImageModal } from '../components/modals/ImageModal';
import { MapModal } from '../components/modals/MapModal';
import { SaveMapModal } from '../components/modals/SaveMapModal';
import { NpcFormModal } from '../components/modals/NpcFormModal';
import { NpcPickerModal } from '../components/modals/NpcPickerModal';
import { TokenModal } from '../components/modals/TokenModal';
import { ConfirmModal } from '../components/ui/ConfirmModal';
import { UnsavedChangesModal } from '../components/modals/UnsavedChangesModal';
import { ChatPanel } from '../components/chat/ChatPanel';
import { useChat } from '../hooks/useChat';
import { useMapEditor } from '../hooks/useMapEditor';
import { useCampaign } from '../hooks/useCampaign';
import { useDocumentTitle } from '../hooks/useDocumentTitle';
import { LAYOUT_MODE, isChatVisible, isMapVisible } from '../lib/layoutMode';
import { setMapRegion } from '../lib/mapRegion';
import { useMapToken } from '../hooks/useMapToken';
import { useTurn } from '../hooks/useTurn';
import { useTableRoute } from '../hooks/useTableRoute';
import { useUnsavedGuard } from '../hooks/useUnsavedGuard';
import type { CharacterEditTarget } from '../components/modals/CampaignCharacterModal';
import type { ActTarget } from '../lib/turnStatus';
import type { CampaignNpcInfo } from '../types/npc';
import type { TokenInfo } from '../types/token';

/** 3D view of story maps (033): its own chunk, so three.js is downloaded only when someone opens it. */
const StoryView = lazy(() => import('../components/story/StoryView'));

/**
 * Main screen: the map with the grid and/or the campaign chat (041: map, map over chat, or chat only — the map isn't
 * mounted in the last); every other window opens as a modal over it.
 */
export const MainPage = () => {
  const { isDirty, draft, viewMode, setViewMode } = useMapEditor();
  const { currentCampaign, isMaster } = useCampaign();
  /** A player in a campaign whose master hasn't picked a map yet sees no map, and says so (039). */
  const noCurrentMap = !!currentCampaign && !isMaster && currentCampaign.currentMapId === null && draft.mapId === null;
  // The tab says what is open (040): "{map} — {campaign} | Roll6", "{model} | Roll6", "{campaign} | Roll6" or "Roll6".
  useDocumentTitle({
    mapName: draft.mapModelId !== null ? draft.name : null,
    campaignName: currentCampaign?.name ?? null,
    isCampaignMap: draft.mapId !== null && draft.campaignId === (currentCampaign?.campaignId ?? null),
  });
  const { guard, requestSave, saveModalProps, unsavedModalProps } = useUnsavedGuard();
  useTableRoute(guard);
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
  /** Piece acting ("Agir") and piece waiting for the "Resetar turno" confirmation (016). */
  const [acting, setActing] = useState<ActTarget | null>(null);
  const [toReset, setToReset] = useState<{ mapTokenId: number; name: string } | null>(null);
  const { reset: resetTurn } = useTurn();
  const { addToken, changeToken, placeCharacter, deleteToken } = useMapToken();
  const { t } = useTranslation();
  const { canRead: chatReadable, layoutMode } = useChat();
  // Without access to a campaign's chat the table is only the map, whatever was chosen before.
  const layout = chatReadable ? layoutMode : LAYOUT_MODE.map;
  const showMap = isMapVisible(layout);
  const showChat = isChatVisible(layout);

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

  const onConfirmReset = async () => {
    if (!toReset) return;
    try {
      const result = await resetTurn(toReset.mapTokenId);
      if (result.reverted) toast.success(t('toast.turnReset', { name: toReset.name }));
      else toast.warning(t('toast.turnResetNotReverted', { name: toReset.name }));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t('common.unknownError'));
      throw err;
    }
  };

  const tokenPickTitle = tokenPick?.kind === 'character'
    ? t('mapTokens.chooseCharacterToken', { name: tokenPick.participation.characterName })
    : undefined;

  return (
    <div className={`stm-main stm-layout-${layout}`}>
      {showMap && (
        <div className="stm-map-region" ref={setMapRegion}>
          {viewMode === '3d' ? (
            <Suspense fallback={<div className="stm-story"><div className="stm-story-loading text-secondary small">{t('story.loading')}</div></div>}>
              <StoryView onUnsupported={() => {
                toast.error(t('story.noWebgl'));
                setViewMode('2d');
              }} />
            </Suspense>
          ) : (
            <MapCanvas
              onPickToken={setTokenPick}
              onDeleteToken={setToDelete}
              onAct={setActing}
              onResetTurn={setToReset}
              picking={tokenPick !== null || toDelete !== null}
            />
          )}
          <PartyPanel onOpen={(participation, mode) => setEditing({ participation, mode })} />
          <NpcPanel onAdd={() => setNpcPickerOpen(true)} onEdit={setEditingNpc} />
          <MapControls onOpenImage={openImage} />
          <GridSizeFooter onEditGrid={() => setGridOpen(true)} />
        </div>
      )}
      {showChat && (
        <div className="stm-chat-region">
          <ChatPanel />
        </div>
      )}
      {noCurrentMap && <div className="stm-no-map-notice" role="status">{t('map.noCurrentMap')}</div>}
      <TopMenu
        onOpenCampaign={() => setCampaignOpen(true)}
        onOpenMap={() => setMapOpen(true)}
        onSave={() => { void requestSave(); }}
        guard={guard}
      />

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
      <ActModal open={acting !== null} piece={acting} onClose={() => setActing(null)} />
      <ConfirmModal
        open={toReset !== null}
        onOpenChange={(o) => { if (!o) setToReset(null); }}
        title={t('turn.resetTitle')}
        message={toReset ? t('turn.resetMessage', { name: toReset.name }) : ''}
        confirmLabel={t('turn.reset')}
        onConfirm={onConfirmReset}
        danger
      />
      <CampaignCharacterModal
        open={editing !== null}
        onOpenChange={(o) => { if (!o) setEditing(null); }}
        editing={editing}
      />
    </div>
  );
};

export default MainPage;
