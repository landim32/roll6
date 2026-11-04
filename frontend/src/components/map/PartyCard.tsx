import { useTranslation } from 'react-i18next';
import { CharacterAvatar } from '../ui/CharacterAvatar';
import { TurnStatusDot } from '../ui/TurnStatusDot';
import { useTurn } from '../../hooks/useTurn';
import { characterStatus } from '../../lib/turnStatus';
import { VitalBar } from './VitalBar';
import { PARTICIPATION_MODE } from '../../lib/campaignCharacterForm';
import { PARTICIPATION_DRAG_TYPE } from '../../lib/mapTokens';
import type { ParticipationMode } from '../../lib/campaignCharacterForm';
import type { CampaignCharacterInfo } from '../../types/campaignCharacter';
import { ArrowRepeatIcon, EyeIcon, MapIcon, PencilIcon } from '../ui/icons';
import { PostureBadge } from '../ui/PostureBadge';
import { POSTURE } from '../../types/mapToken';

interface PartyCardProps {
  member: CampaignCharacterInfo;
  /** The user's current character (highlighted). */
  current: boolean;
  /** Owner/master get the pencil (edit); everyone else the eye (read-only). */
  mode: ParticipationMode;
  onOpen: () => void;
  /** The master can drop the card on a hex of the open campaign map (011 US2). */
  draggable?: boolean;
  /** The master sees which map the character is on (108), when it isn't the open one. */
  showMap?: boolean;
  /** Takes the master to the character's map; without it the name is plain text. */
  onOpenMap?: () => void;
}

/**
 * One character of the party: round picture, name, life and energy bars (current/total), its status in the campaign
 * and its posture (031: badge when down or out of combat; out of combat also turns the picture black and white).
 */
export const PartyCard = ({ member, current, mode, onOpen, draggable = false, showMap = false, onOpenMap }: PartyCardProps) => {
  const { t } = useTranslation();
  const { turnNo, entries } = useTurn();
  const view = mode === PARTICIPATION_MODE.viewer;
  const mapLabel = member.mapName ?? t('party.noMap');
  return (
    <li
      className={`stm-party-card${current ? ' is-current' : ''}${draggable ? ' stm-party-draggable' : ''}`}
      draggable={draggable}
      onDragStart={draggable ? (event) => {
        event.dataTransfer.setData(PARTICIPATION_DRAG_TYPE, String(member.campaignCharacterId));
        event.dataTransfer.effectAllowed = 'move';
      } : undefined}
    >
      <span className={`d-inline-flex flex-shrink-0${member.posture === POSTURE.outOfCombat ? ' stm-grayscale' : ''}`}>
        <CharacterAvatar name={member.characterName} imageUrl={member.characterImageUrl} size={32} />
      </span>
      <div className="stm-party-info">
        <div className="stm-party-name">
          {turnNo !== null && <TurnStatusDot status={characterStatus(entries, member.characterId)} />}
          <span title={member.characterName}>{member.characterName}</span>
          <PostureBadge posture={member.posture} />
          {member.repeatedAction && (
            <span className="stm-repeat-mark" title={`${t('hexMenu.repeatedActive')}: ${member.repeatedAction}`}
              aria-label={t('hexMenu.repeatedActive')}><ArrowRepeatIcon size={12} /></span>
          )}
          <button
            type="button"
            className="btn btn-link btn-sm p-0 ms-auto"
            aria-label={t(view ? 'party.view' : 'party.edit', { name: member.characterName })}
            title={t(view ? 'party.view' : 'party.edit', { name: member.characterName })}
            onClick={onOpen}
          >
            {view ? <EyeIcon size={12} /> : <PencilIcon size={12} />}
          </button>
        </div>
        <VitalBar label={t('party.life')} current={member.currentLife} total={member.totalLife} variant="life" />
        <VitalBar label={t('party.energy')} current={member.currentEnergy} total={member.totalEnergy} variant="energy" />
        {member.characterStatus && (
          <small className="d-block text-body-secondary text-truncate" title={member.characterStatus}>{member.characterStatus}</small>
        )}
        {showMap && (onOpenMap ? (
          <button type="button" className="btn btn-link p-0 border-0 stm-party-map stm-party-map-link" onClick={onOpenMap}
            title={t('party.openMap', { name: mapLabel })} aria-label={t('party.openMap', { name: mapLabel })}>
            <MapIcon size={10} />
            <span className="text-truncate">{mapLabel}</span>
          </button>
        ) : (
          <small className="stm-party-map text-body-secondary" title={mapLabel}>
            <MapIcon size={10} />
            <span className="text-truncate">{mapLabel}</span>
          </small>
        ))}
      </div>
    </li>
  );
};

export default PartyCard;
