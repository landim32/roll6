import { useTranslation } from 'react-i18next';
import { CharacterAvatar } from '../ui/CharacterAvatar';
import { VitalBar } from './VitalBar';
import { isFallen } from '../../lib/vitals';
import type { CampaignCharacterInfo } from '../../types/campaignCharacter';

interface PartyCardProps {
  member: CampaignCharacterInfo;
  /** The user's current character (highlighted). */
  current: boolean;
  canEdit: boolean;
  onEdit: () => void;
}

const PencilIcon = () => (
  <svg width="12" height="12" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true">
    <path d="M12.146.146a.5.5 0 0 1 .708 0l3 3a.5.5 0 0 1 0 .708l-10 10a.5.5 0 0 1-.168.11l-5 2a.5.5 0 0 1-.65-.65l2-5a.5.5 0 0 1 .11-.168zM11.207 2.5 13.5 4.793 14.793 3.5 12.5 1.207zm1.586 3L10.5 3.207 4 9.707V10h.5a.5.5 0 0 1 .5.5v.5h.5a.5.5 0 0 1 .5.5v.5h.293zm-9.761 5.175-.106.106-1.528 3.821 3.821-1.528.106-.106A.5.5 0 0 1 5 12.5V12h-.5a.5.5 0 0 1-.5-.5V11h-.5a.5.5 0 0 1-.468-.325" />
  </svg>
);

/** One character of the party: round picture, name, life and energy bars (current/total). */
export const PartyCard = ({ member, current, canEdit, onEdit }: PartyCardProps) => {
  const { t } = useTranslation();
  const fallen = isFallen(member.currentLife);
  return (
    <li className={`stm-party-card${current ? ' is-current' : ''}${fallen ? ' stm-party-fallen' : ''}`}>
      <CharacterAvatar name={member.characterName} imageUrl={member.characterImageUrl} size={32} />
      <div className="stm-party-info">
        <div className="stm-party-name">
          <span title={member.characterName}>{member.characterName}</span>
          {fallen && <span className="badge text-bg-danger">{t('party.fallen')}</span>}
          {canEdit && (
            <button type="button" className="btn btn-link btn-sm p-0 ms-auto" aria-label={t('party.edit', { name: member.characterName })} onClick={onEdit}>
              <PencilIcon />
            </button>
          )}
        </div>
        <VitalBar label={t('party.life')} current={member.currentLife} total={member.totalLife} variant="life" />
        <VitalBar label={t('party.energy')} current={member.currentEnergy} total={member.totalEnergy} variant="energy" />
      </div>
    </li>
  );
};

export default PartyCard;
