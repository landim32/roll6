import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { PartyCard } from './PartyCard';
import { useAuth } from '../../hooks/useAuth';
import { useCampaign } from '../../hooks/useCampaign';
import { useCharacter } from '../../hooks/useCharacter';
import type { CampaignCharacterInfo } from '../../types/campaignCharacter';

interface PartyPanelProps {
  onEdit: (member: CampaignCharacterInfo) => void;
}

/** localStorage key of the collapsed state ("1" = collapsed). */
const COLLAPSED_KEY = 'roll6:party-collapsed';

const readCollapsed = (): boolean => {
  try {
    return localStorage.getItem(COLLAPSED_KEY) === '1';
  } catch {
    return false;
  }
};

/**
 * Fixed, compact panel over the map (left, below the menu) with the approved characters of the
 * current campaign. The master may edit every card; players only their own.
 */
export const PartyPanel = ({ onEdit }: PartyPanelProps) => {
  const { t } = useTranslation();
  const { session } = useAuth();
  const { isMaster } = useCampaign();
  const { party, currentSelection } = useCharacter();
  const [collapsed, setCollapsed] = useState(readCollapsed);

  if (party.length === 0) return null;

  const toggle = () => {
    setCollapsed((prev) => {
      try {
        localStorage.setItem(COLLAPSED_KEY, prev ? '0' : '1');
      } catch {
        // Not remembered when storage is blocked.
      }
      return !prev;
    });
  };

  const title = t('party.title', { count: party.length });

  if (collapsed) {
    return (
      <button type="button" className="stm-party stm-party-collapsed" onClick={toggle} aria-label={t('party.expand')} title={t('party.expand')}>
        <span>{title}</span>
      </button>
    );
  }

  return (
    <section className="stm-party" aria-label={title}>
      <header>
        <span>{title}</span>
        <button type="button" className="btn btn-link btn-sm p-0 text-decoration-none" onClick={toggle} aria-label={t('party.collapse')} title={t('party.collapse')}>‹</button>
      </header>
      <ul>
        {party.map((member) => (
          <PartyCard
            key={member.campaignCharacterId}
            member={member}
            current={currentSelection === member.characterId}
            canEdit={isMaster || member.characterOwnerId === session?.user.userId}
            onEdit={() => onEdit(member)}
          />
        ))}
      </ul>
    </section>
  );
};

export default PartyPanel;
