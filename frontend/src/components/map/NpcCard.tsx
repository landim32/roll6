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
 * One campaign NPC: round picture (or its token) and name. Each occurrence on the open map is listed with its own
 * current/total life and energy and its status (026); without occurrences, the NPC's totals. The turn circle
 * aggregates the NPC's pieces on the open map (each occurrence has its own turn).
 */
export const NpcCard = ({ npc, onEdit, draggable }: NpcCardProps) => {
  const { t } = useTranslation();
  const { turnNo, entries } = useTurn();
  const { mapTokens } = useMapToken();
  const occurrences = mapTokens.filter((token) => token.npcId === npc.npcId && token.mapNpcId !== null);
  const occurrenceIds = occurrences.map((token) => token.mapNpcId!);
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
        {occurrences.length === 0 ? (
          <>
            <VitalBar label={t('party.life')} current={npc.life} total={npc.life} variant="life" />
            <VitalBar label={t('party.energy')} current={npc.energy} total={npc.energy} variant="energy" />
          </>
        ) : (
          <ul className="list-unstyled mb-0" aria-label={t('npcs.occurrences', { name: npc.name })}>
            {occurrences.map((piece) => (
              <li key={piece.mapTokenId} className="mt-1">
                {occurrences.length > 1 && <small className="d-block text-truncate" title={piece.name}>{piece.name}</small>}
                <VitalBar label={t('party.life')} current={piece.life} total={piece.totalLife} variant="life" />
                <VitalBar label={t('party.energy')} current={piece.energy} total={piece.totalEnergy} variant="energy" />
                {piece.status && <small className="d-block text-body-secondary text-truncate" title={piece.status}>{piece.status}</small>}
              </li>
            ))}
          </ul>
        )}
      </div>
    </li>
  );
};

export default NpcCard;
