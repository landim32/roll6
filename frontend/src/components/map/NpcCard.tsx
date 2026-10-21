import { useTranslation } from 'react-i18next';
import { CharacterAvatar } from '../ui/CharacterAvatar';
import { TurnStatusDot } from '../ui/TurnStatusDot';
import { useMapToken } from '../../hooks/useMapToken';
import { useTurn } from '../../hooks/useTurn';
import { npcStatus, occurrenceStatus } from '../../lib/turnStatus';
import { VitalBar } from './VitalBar';
import { NPC_DRAG_TYPE } from '../../lib/mapTokens';
import type { MapTokenInfo } from '../../types/mapToken';
import { NPC_CATEGORY } from '../../types/npc';
import type { CampaignNpcInfo } from '../../types/npc';
import { ArrowRepeatIcon, PencilIcon, XIcon } from '../ui/icons';
import { PostureBadge } from '../ui/PostureBadge';
import { POSTURE } from '../../types/mapToken';

interface NpcCardProps {
  npc: CampaignNpcInfo;
  /** Master only: the pencil opens the NPC form; players see the card without it. */
  onEdit?: () => void;
  /** The master can drop the card on a hex of the open campaign map: each drop is a new piece. */
  draggable: boolean;
  /** Master only (051): pencil and X on each instance row. */
  onEditInstance?: (piece: MapTokenInfo) => void;
  onRemoveInstance?: (piece: MapTokenInfo) => void;
  /** A smaller card under the card of the ally's master character (071). */
  compact?: boolean;
}

/**
 * One campaign NPC: round picture (or its token) and name. Each occurrence on the open map is listed with its own
 * current/total life and energy and its status (026); without occurrences, the NPC's totals. Each instance has its own
 * turn, so each row carries its own turn circle (052); the circle on the NPC's name is only shown while it has no piece
 * on the open map (entries recorded for the NPC as a whole).
 */
export const NpcCard = ({ npc, onEdit, draggable, onEditInstance, onRemoveInstance, compact = false }: NpcCardProps) => {
  const { t } = useTranslation();
  const { turnNo, entries } = useTurn();
  const { mapTokens } = useMapToken();
  const occurrences = mapTokens.filter((token) => token.npcId === npc.npcId && token.mapNpcId !== null);
  const occurrenceIds = occurrences.map((token) => token.mapNpcId!);
  // 031: the picture turns black and white when every occurrence on the map is out of combat.
  const allOut = occurrences.length > 0 && occurrences.every((token) => token.posture === POSTURE.outOfCombat);
  return (
    <li
      className={`stm-party-card${draggable ? ' stm-party-draggable' : ''}${compact ? ' stm-ally-card' : ''}`}
      draggable={draggable}
      onDragStart={draggable ? (event) => {
        event.dataTransfer.setData(NPC_DRAG_TYPE, String(npc.npcId));
        event.dataTransfer.effectAllowed = 'copy';
      } : undefined}
    >
      <span className={`d-inline-flex flex-shrink-0${allOut ? ' stm-grayscale' : ''}`}>
        <CharacterAvatar name={npc.name} imageUrl={npc.imageUrl ?? npc.tokenImageUrl} size={compact ? 24 : 32} />
      </span>
      <div className="stm-party-info">
        <div className="stm-party-name">
          {turnNo !== null && occurrences.length === 0 && <TurnStatusDot status={npcStatus(entries, npc.npcId, occurrenceIds)} />}
          <span title={npc.name}>{npc.name}</span>
          {/* 071: enemies carry no mark; the panel tells allies apart. */}
          {npc.category === NPC_CATEGORY.neutral && <span className="badge text-bg-secondary stm-npc-category">{t('npcs.category.2')}</span>}
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
                {/* 051: every instance has its own name; the master edits or removes it from here. */}
                <small className="d-flex align-items-center gap-1" title={piece.name}>
                  {turnNo !== null && <TurnStatusDot status={occurrenceStatus(entries, piece.mapNpcId!)} />}
                  <span className="text-truncate">{piece.name}</span>
                  <PostureBadge posture={piece.posture} />
                  {piece.repeatedAction && (
                    <span className="stm-repeat-mark" title={`${t('hexMenu.repeatedActive')}: ${piece.repeatedAction}`}
                      aria-label={t('hexMenu.repeatedActive')}><ArrowRepeatIcon size={12} /></span>
                  )}
                  {onEditInstance && (
                    <button type="button" className="btn btn-link btn-sm p-0 ms-auto" aria-label={t('npcs.editInstance', { name: piece.name })}
                      title={t('npcs.editInstance', { name: piece.name })} onClick={() => onEditInstance(piece)}>
                      <PencilIcon size={12} />
                    </button>
                  )}
                  {onRemoveInstance && (
                    <button type="button" className={`btn btn-link btn-sm p-0 text-danger${onEditInstance ? '' : ' ms-auto'}`}
                      aria-label={t('npcs.removeInstance', { name: piece.name })} title={t('npcs.removeInstance', { name: piece.name })}
                      onClick={() => onRemoveInstance(piece)}>
                      <XIcon size={12} />
                    </button>
                  )}
                </small>
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
