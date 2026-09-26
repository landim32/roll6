import { useTranslation } from 'react-i18next';
import { CharacterAvatar } from '../ui/CharacterAvatar';
import { VitalBar } from './VitalBar';
import { isFallen } from '../../lib/vitals';
import { PARTICIPATION_MODE } from '../../lib/campaignCharacterForm';
import { PARTICIPATION_DRAG_TYPE } from '../../lib/mapTokens';
import type { ParticipationMode } from '../../lib/campaignCharacterForm';
import type { CampaignCharacterInfo } from '../../types/campaignCharacter';

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

const PencilIcon = () => (
  <svg width="12" height="12" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true">
    <path d="M12.146.146a.5.5 0 0 1 .708 0l3 3a.5.5 0 0 1 0 .708l-10 10a.5.5 0 0 1-.168.11l-5 2a.5.5 0 0 1-.65-.65l2-5a.5.5 0 0 1 .11-.168zM11.207 2.5 13.5 4.793 14.793 3.5 12.5 1.207zm1.586 3L10.5 3.207 4 9.707V10h.5a.5.5 0 0 1 .5.5v.5h.5a.5.5 0 0 1 .5.5v.5h.293zm-9.761 5.175-.106.106-1.528 3.821 3.821-1.528.106-.106A.5.5 0 0 1 5 12.5V12h-.5a.5.5 0 0 1-.5-.5V11h-.5a.5.5 0 0 1-.468-.325" />
  </svg>
);

const EyeIcon = () => (
  <svg width="12" height="12" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true">
    <path d="M16 8s-3-5.5-8-5.5S0 8 0 8s3 5.5 8 5.5S16 8 16 8M1.173 8a13 13 0 0 1 1.66-2.043C4.12 4.668 5.88 3.5 8 3.5s3.879 1.168 5.168 2.457A13 13 0 0 1 14.828 8q-.086.13-.195.288c-.335.48-.83 1.12-1.465 1.755C11.879 11.332 10.119 12.5 8 12.5s-3.879-1.168-5.168-2.457A13 13 0 0 1 1.172 8z" />
    <path d="M8 5.5a2.5 2.5 0 1 0 0 5 2.5 2.5 0 0 0 0-5M4.5 8a3.5 3.5 0 1 1 7 0 3.5 3.5 0 0 1-7 0" />
  </svg>
);

/** One character of the party: round picture, name, life and energy bars (current/total). */
export const PartyCard = ({ member, current, mode, onOpen, draggable = false }: PartyCardProps) => {
  const { t } = useTranslation();
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
      <CharacterAvatar name={member.characterName} imageUrl={member.characterImageUrl} size={32} />
      <div className="stm-party-info">
        <div className="stm-party-name">
          <span title={member.characterName}>{member.characterName}</span>
          {fallen && <span className="badge text-bg-danger">{t('party.fallen')}</span>}
          <button
            type="button"
            className="btn btn-link btn-sm p-0 ms-auto"
            aria-label={t(view ? 'party.view' : 'party.edit', { name: member.characterName })}
            title={t(view ? 'party.view' : 'party.edit', { name: member.characterName })}
            onClick={onOpen}
          >
            {view ? <EyeIcon /> : <PencilIcon />}
          </button>
        </div>
        <VitalBar label={t('party.life')} current={member.currentLife} total={member.totalLife} variant="life" />
        <VitalBar label={t('party.energy')} current={member.currentEnergy} total={member.totalEnergy} variant="energy" />
      </div>
    </li>
  );
};

export default PartyCard;
