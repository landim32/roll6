import { useTranslation } from 'react-i18next';
import { CharacterAvatar } from '../ui/CharacterAvatar';
import { TurnStatusDot } from '../ui/TurnStatusDot';
import { useMapToken } from '../../hooks/useMapToken';
import { useTurn } from '../../hooks/useTurn';
import { npcStatus } from '../../lib/turnStatus';
import { VitalBar } from './VitalBar';
import { NPC_DRAG_TYPE } from '../../lib/mapTokens';
import type { CampaignNpcInfo } from '../../types/npc';
import { PencilIcon } from '../ui/icons';

interface NpcCardProps {
  npc: CampaignNpcInfo;
  /** Master only: the pencil opens the NPC form; players see the card without it. */
  onEdit?: () => void;
  /** The master can drop the card on a hex of the open campaign map: each drop is a new piece. */
  draggable: boolean;
}

/**
 * One campaign NPC: round picture (or its token), name and the NPC's base life/energy bars. The turn circle
 * aggregates the NPC's pieces on the open map (each occurrence has its own turn).
 */
export const NpcCard = ({ npc, onEdit, draggable }: NpcCardProps) => {
  const { t } = useTranslation();
  const { turnNo, entries } = useTurn();
  const { mapTokens } = useMapToken();
  const occurrenceIds = mapTokens
    .filter((token) => token.npcId === npc.npcId && token.mapNpcId !== null)
    .map((token) => token.mapNpcId!);
  return (
    <li
      className={`stm-party-card${draggable ? ' stm-party-draggable' : ''}`}
      draggable={draggable}
      onDragStart={draggable ? (event) => {
        event.dataTransfer.setData(NPC_DRAG_TYPE, String(npc.npcId));
        event.dataTransfer.effectAllowed = 'copy';
      } : undefined}
    >
      <CharacterAvatar name={npc.name} imageUrl={npc.imageUrl ?? npc.tokenImageUrl} size={32} />
      <div className="stm-party-info">
        <div className="stm-party-name">
          {turnNo !== null && <TurnStatusDot status={npcStatus(entries, npc.npcId, occurrenceIds)} />}
          <span title={npc.name}>{npc.name}</span>
          {onEdit && (
            <button type="button" className="btn btn-link btn-sm p-0 ms-auto" aria-label={t('npcs.edit', { name: npc.name })}
              title={t('npcs.edit', { name: npc.name })} onClick={onEdit}>
              <PencilIcon size={12} />
            </button>
          )}
        </div>
        <VitalBar label={t('party.life')} current={npc.life} total={npc.life} variant="life" />
        <VitalBar label={t('party.energy')} current={npc.energy} total={npc.energy} variant="energy" />
      </div>
    </li>
  );
};

export default NpcCard;
