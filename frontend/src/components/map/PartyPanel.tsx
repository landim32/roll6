import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { PartyCard } from './PartyCard';
import { NpcCard } from './NpcCard';
import { useNpc } from '../../hooks/useNpc';
import { groupNpcs } from '../../lib/npcCategory';
import type { MapTokenInfo } from '../../types/mapToken';
import type { CampaignNpcInfo } from '../../types/npc';
import { SidePanel } from './SidePanel';
import { useAuth } from '../../hooks/useAuth';
import { useCampaign } from '../../hooks/useCampaign';
import { useCharacter } from '../../hooks/useCharacter';
import { useMapEditor } from '../../hooks/useMapEditor';
import { useMapToken } from '../../hooks/useMapToken';
import { isOutsideOpenMap } from '../../lib/mapTokens';
import { mapPath } from '../../lib/tableSelect';
import { mapService } from '../../Services/mapService';
import { participationMode } from '../../lib/campaignCharacterForm';
import type { ParticipationMode } from '../../lib/campaignCharacterForm';
import type { CampaignCharacterInfo } from '../../types/campaignCharacter';

interface PartyPanelProps {
  onOpen: (member: CampaignCharacterInfo, mode: ParticipationMode) => void;
  /** Allies (071): the NPC form (master), the instance form (master or the commander) and "Retirar do mapa" (master). */
  onEditNpc: (npc: CampaignNpcInfo) => void;
  onEditInstance: (piece: MapTokenInfo) => void;
  onRemoveInstance: (piece: MapTokenInfo) => void;
  /** A fixed column beside the chat instead of a panel over the map. */
  docked?: boolean;
}

/**
 * Fixed, compact panel over the map (left, below the menu) with the approved characters of the
 * current campaign. Every card opens the character form: to edit for the owner or the master, read-only
 * for the other participants. Since 071 the allies are here too: under the card of their master character (smaller),
 * or in an "Aliados" group after the party.
 */
export const PartyPanel = ({ onOpen, onEditNpc, onEditInstance, onRemoveInstance, docked = false }: PartyPanelProps) => {
  const { t } = useTranslation();
  const { session } = useAuth();
  const { isMaster } = useCampaign();
  const { party, currentSelection } = useCharacter();
  const { canPlace } = useMapToken();
  const { draft } = useMapEditor();
  const { campaignNpcs } = useNpc();
  const navigate = useNavigate();

  if (party.length === 0) return null;
  const { allies, byMaster } = groupNpcs(campaignNpcs, party.map((p) => p.campaignCharacterId));

  /** Through the address, so the table route's unsaved-changes guard applies. */
  const openMap = async (mapId: number) => {
    try {
      const map = await mapService.getById(mapId);
      navigate(mapPath(map.slug));
    } catch {
      toast.error(t('route.notFound'));
    }
  };

  /** An ally card: the master manages it; the owner of its master character edits its instances. */
  const allyCard = (npc: CampaignNpcInfo, commander: boolean, compact: boolean) => (
    <NpcCard
      key={`npc-${npc.campaignNpcId}`}
      npc={npc}
      compact={compact}
      onEdit={isMaster ? () => onEditNpc(npc) : undefined}
      onEditInstance={isMaster || commander ? onEditInstance : undefined}
      onRemoveInstance={isMaster ? onRemoveInstance : undefined}
      draggable={isMaster && canPlace}
    />
  );

  return (
    <SidePanel
      docked={docked}
      side="left"
      title={t('party.title', { count: party.length })}
      storageKey="roll6:party-collapsed"
      collapseLabel={t('party.collapse')}
      expandLabel={t('party.expand')}
    >
      {party.map((member) => {
        const owner = member.characterOwnerId === session?.user.userId;
        const mode = participationMode(isMaster, owner);
        const { mapId } = member;
        return [
          <PartyCard
            key={member.campaignCharacterId}
            member={member}
            current={currentSelection === member.characterId}
            mode={mode}
            onOpen={() => onOpen(member, mode)}
            // Only the master puts characters on maps (108); he also sees where those outside the open map are.
            draggable={canPlace}
            showMap={isMaster && isOutsideOpenMap(mapId, draft.mapId)}
            onOpenMap={isMaster && mapId !== null ? () => void openMap(mapId) : undefined}
          />,
          ...(byMaster.get(member.campaignCharacterId) ?? []).map((npc) => allyCard(npc, owner, true)),
        ];
      })}
      {allies.length > 0 && <li className="stm-allies-title" key="allies-title">{t('npcs.allies')}</li>}
      {allies.map((npc) => allyCard(npc, false, false))}
    </SidePanel>
  );
};

export default PartyPanel;
