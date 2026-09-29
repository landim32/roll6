import { useTranslation } from 'react-i18next';
import { CharacterAvatar } from '../ui/CharacterAvatar';
import { TurnStatusDot } from '../ui/TurnStatusDot';
import { useTurn } from '../../hooks/useTurn';
import { characterStatus } from '../../lib/turnStatus';
import { VitalBar } from './VitalBar';
import { isFallen } from '../../lib/vitals';
import { PARTICIPATION_MODE } from '../../lib/campaignCharacterForm';
import { PARTICIPATION_DRAG_TYPE } from '../../lib/mapTokens';
import type { ParticipationMode } from '../../lib/campaignCharacterForm';
import type { CampaignCharacterInfo } from '../../types/campaignCharacter';
import { EyeIcon, PencilIcon } from '../ui/icons';
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
}

/**
 * One character of the party: round picture, name, life and energy bars (current/total), its status in the campaign
 * and its posture (031: badge when down or out of combat; out of combat also turns the picture black and white).
 */
export const PartyCard = ({ member, current, mode, onOpen, draggable = false }: PartyCardProps) => {
  const { t } = useTranslation();
  const { turnNo, entries } = useTurn();
  const fallen = isFallen(member.currentLife);
  const view = mode === PARTICIPATION_MODE.viewer;
  return (
    <li
      className={`stm-party-card${current ? ' is-current' : ''}${fallen ? ' stm-party-fallen' : ''}${draggable ? ' stm-party-draggable' : ''}`}
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
          {member.posture !== POSTURE.standing
            ? <PostureBadge posture={member.posture} />
            : fallen && <span className="badge text-bg-danger">{t('party.fallen')}</span>}
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
      </div>
    </li>
  );
};

export default PartyCard;
