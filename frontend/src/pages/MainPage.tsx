import { lazy, Suspense, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { GridSizeFooter } from '../components/map/GridSizeFooter';
import { MapCanvas } from '../components/map/MapCanvas';
import type { TokenPickRequest } from '../components/map/MapCanvas';
import { MapControls } from '../components/map/MapControls';
import { NpcPanel } from '../components/map/NpcPanel';
import { MapNpcFormModal } from '../components/npcs/MapNpcFormModal';
import type { MapTokenInfo } from '../types/mapToken';
import { PartyPanel } from '../components/map/PartyPanel';
import { TopMenu } from '../components/menu/TopMenu';
import { ActModal } from '../components/modals/ActModal';
import { RepeatedActionModal } from '../components/modals/RepeatedActionModal';
import type { RepeatedTarget } from '../components/modals/RepeatedActionModal';
import { CampaignCharacterModal } from '../components/modals/CampaignCharacterModal';
import { GridSizeModal } from '../components/modals/GridSizeModal';
import { ImageModal } from '../components/modals/ImageModal';
import { SaveMapModal } from '../components/modals/SaveMapModal';
import { useNavigate } from 'react-router-dom';
import { npcPath } from '../lib/libraryRoutes';
import type { CampaignNpcInfo } from '../types/npc';
import { NpcPickerModal } from '../components/modals/NpcPickerModal';
import { TokenModal } from '../components/modals/TokenModal';
import { ConfirmModal } from '../components/ui/ConfirmModal';
import { UnsavedChangesModal } from '../components/modals/UnsavedChangesModal';
import { ChatPanel } from '../components/chat/ChatPanel';
import { InstallHint } from '../components/install/InstallHint';
import { IosInstallGuide } from '../components/install/IosInstallGuide';
import { useChat } from '../hooks/useChat';
import { useMapEditor } from '../hooks/useMapEditor';
import { DESKTOP_QUERY, useMediaQuery } from '../hooks/useMediaQuery';
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
import type { TokenInfo } from '../types/token';

/** 3D view of story maps (033): its own chunk, so three.js is downloaded only when someone opens it. */
const StoryView = lazy(() => import('../components/story/StoryView'));
// The isometric lit view (103): its own lazy chunk, like the 3D view.
const IsoView = lazy(() => import('../components/iso/IsoView'));

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
  const [imageOpen, setImageOpen] = useState(false);
  const [gridOpen, setGridOpen] = useState(false);
  /** Party card opened in the character form (edit or read-only, per mode). */
  const [editing, setEditing] = useState<CharacterEditTarget | null>(null);
  /** What the tokens modal was opened for from the map (hex menu or a character without a token). */
  const [tokenPick, setTokenPick] = useState<TokenPickRequest | null>(null);
  /** "Incluir NPC" window and the NPC whose pencil was clicked (014). */
  const [npcPickerOpen, setNpcPickerOpen] = useState(false);
  const navigate = useNavigate();
  /** The NPC card's pencil opens that NPC's own page in the library (098; 087 sent it to the campaign's NPC list). */
  const editNpc = (npc: CampaignNpcInfo) => navigate(npcPath(npc.npcId));
  /** Piece waiting for the delete confirmation; with `mapNpcId` it is an NPC instance leaving the map (051). */
  const [toDelete, setToDelete] = useState<{ mapTokenId: number; name: string; mapNpcId: number | null } | null>(null);
  /** NPC instance open in "Editar NPC" (051). */
  const [editingInstance, setEditingInstance] = useState<MapTokenInfo | null>(null);
  /** Piece acting ("Agir") and piece waiting for the "Resetar turno" confirmation (016). */
  const [acting, setActing] = useState<ActTarget | null>(null);
  /** Piece whose repeated action is open (099). */
  const [repeating, setRepeating] = useState<RepeatedTarget | null>(null);
  const [toReset, setToReset] = useState<{ mapTokenId: number; name: string } | null>(null);
  const { reset: resetTurn } = useTurn();
  const { addToken, changeToken, placeCharacter, deleteToken } = useMapToken();
  const { t } = useTranslation();
  const { canRead: chatReadable, layoutMode } = useChat();
  // Without access to a campaign's chat the table is only the map, whatever was chosen before.
  const layout = chatReadable ? layoutMode : LAYOUT_MODE.map;
  const showMap = isMapVisible(layout);
  const showChat = isChatVisible(layout);
  const desktop = useMediaQuery(DESKTOP_QUERY);

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

  /** The X of an instance row (051): same confirmation as "Retirar do mapa" on the piece. */
  const askRemoveInstance = (piece: MapTokenInfo) =>
    setToDelete({ mapTokenId: piece.mapTokenId, name: piece.name, mapNpcId: piece.mapNpcId });

  const onConfirmDelete = async () => {
    if (!toDelete) return;
    try {
      await deleteToken(toDelete.mapTokenId);
      toast.success(t(toDelete.mapNpcId !== null ? 'toast.npcRemovedFromMap' : 'toast.mapTokenDeleted', { name: toDelete.name }));
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
          ) : viewMode === 'iso' ? (
            <Suspense fallback={<div className="stm-iso"><div className="stm-iso-loading text-secondary small">{t('iso.loading')}</div></div>}>
              <IsoView
                onUnsupported={() => {
                  toast.error(t('story.noWebgl'));
                  setViewMode('2d');
                }}
                onPickToken={setTokenPick}
                onDeleteToken={setToDelete}
                onEditNpc={setEditingInstance}
                onAct={setActing}
                onRepeated={setRepeating}
                onResetTurn={setToReset}
                picking={tokenPick !== null || toDelete !== null || acting !== null || repeating !== null}
              />
            </Suspense>
          ) : (
            <MapCanvas
              onPickToken={setTokenPick}
              onDeleteToken={setToDelete}
              onEditNpc={setEditingInstance}
              onAct={setActing}
              onRepeated={setRepeating}
              onResetTurn={setToReset}
              picking={tokenPick !== null || toDelete !== null || acting !== null || repeating !== null}
            />
          )}
          <PartyPanel onOpen={(participation, mode) => setEditing({ participation, mode })}
            onEditNpc={editNpc} onEditInstance={setEditingInstance} onRemoveInstance={askRemoveInstance} />
          <NpcPanel onAdd={() => setNpcPickerOpen(true)} onEdit={editNpc} onEditInstance={setEditingInstance} onRemoveInstance={askRemoveInstance} />
          <MapControls onOpenImage={openImage} />
          <GridSizeFooter onEditGrid={() => setGridOpen(true)} />
        </div>
      )}
      {showChat && (
        <div className="stm-chat-region">
          {/* Chat only: the cards come along — fixed columns on the desktop, the map's collapsible panels on phones. */}
          <div className="stm-chat-body">
            {!showMap && <PartyPanel docked={desktop} onOpen={(participation, mode) => setEditing({ participation, mode })}
              onEditNpc={editNpc} onEditInstance={setEditingInstance} onRemoveInstance={askRemoveInstance} />}
            <ChatPanel />
            {!showMap && <NpcPanel docked={desktop} onAdd={() => setNpcPickerOpen(true)} onEdit={editNpc} onEditInstance={setEditingInstance} onRemoveInstance={askRemoveInstance} />}
          </div>
        </div>
      )}
      {noCurrentMap && <div className="stm-no-map-notice" role="status">{t('map.noCurrentMap')}</div>}
      {/* Installable app (042): the one-time phone notice and the iOS guide. */}
      <InstallHint />
      <IosInstallGuide />
      <TopMenu
        onSave={() => { void requestSave(); }}
        guard={guard}
      />

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
      <MapNpcFormModal piece={editingInstance} onClose={() => setEditingInstance(null)} />
      <ConfirmModal
        open={toDelete !== null}
        onOpenChange={(o) => { if (!o) setToDelete(null); }}
        title={t(toDelete?.mapNpcId !== null && toDelete !== null ? 'npcs.removeFromMapTitle' : 'mapTokens.deleteTitle')}
        message={toDelete ? t(toDelete.mapNpcId !== null ? 'npcs.removeFromMapMessage' : 'mapTokens.deleteMessage', { name: toDelete.name }) : ''}
        confirmLabel={t(toDelete?.mapNpcId !== null && toDelete !== null ? 'hexMenu.removeNpc' : 'hexMenu.deleteToken')}
        onConfirm={onConfirmDelete}
        danger
      />
      <ActModal open={acting !== null} piece={acting} onClose={() => setActing(null)} />
      <RepeatedActionModal piece={repeating} onClose={() => setRepeating(null)} />
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
