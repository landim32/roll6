import { useTranslation } from 'react-i18next';
import { CharacterAvatar } from '../ui/CharacterAvatar';
import { TurnStatusDot } from '../ui/TurnStatusDot';
import { useMapToken } from '../../hooks/useMapToken';
import { useTurn } from '../../hooks/useTurn';
import { npcStatus } from '../../lib/turnStatus';
import { VitalBar } from './VitalBar';
import { NPC_DRAG_TYPE } from '../../lib/mapTokens';
import type { CampaignNpcInfo } from '../../types/npc';

interface NpcCardProps {
  npc: CampaignNpcInfo;
  onEdit: () => void;
  /** The master can drop the card on a hex of the open campaign map: each drop is a new piece. */
  draggable: boolean;
}

const PencilIcon = () => (
  <svg width="12" height="12" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true">
    <path d="M12.146.146a.5.5 0 0 1 .708 0l3 3a.5.5 0 0 1 0 .708l-10 10a.5.5 0 0 1-.168.11l-5 2a.5.5 0 0 1-.65-.65l2-5a.5.5 0 0 1 .11-.168zM11.207 2.5 13.5 4.793 14.793 3.5 12.5 1.207zm1.586 3L10.5 3.207 4 9.707V10h.5a.5.5 0 0 1 .5.5v.5h.5a.5.5 0 0 1 .5.5v.5h.293zm-9.761 5.175-.106.106-1.528 3.821 3.821-1.528.106-.106A.5.5 0 0 1 5 12.5V12h-.5a.5.5 0 0 1-.5-.5V11h-.5a.5.5 0 0 1-.468-.325" />
  </svg>
);

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
          <button type="button" className="btn btn-link btn-sm p-0 ms-auto" aria-label={t('npcs.edit', { name: npc.name })}
            title={t('npcs.edit', { name: npc.name })} onClick={onEdit}>
            <PencilIcon />
          </button>
        </div>
        <VitalBar label={t('party.life')} current={npc.life} total={npc.life} variant="life" />
        <VitalBar label={t('party.energy')} current={npc.energy} total={npc.energy} variant="energy" />
      </div>
    </li>
  );
};

export default NpcCard;
