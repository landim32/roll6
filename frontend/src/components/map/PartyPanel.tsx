import { useTranslation } from 'react-i18next';
import { PartyCard } from './PartyCard';
import { SidePanel } from './SidePanel';
import { useAuth } from '../../hooks/useAuth';
import { useCampaign } from '../../hooks/useCampaign';
import { useCharacter } from '../../hooks/useCharacter';
import { useMapToken } from '../../hooks/useMapToken';
import { participationMode } from '../../lib/campaignCharacterForm';
import type { ParticipationMode } from '../../lib/campaignCharacterForm';
import type { CampaignCharacterInfo } from '../../types/campaignCharacter';

interface PartyPanelProps {
  onOpen: (member: CampaignCharacterInfo, mode: ParticipationMode) => void;
}

/**
 * Fixed, compact panel over the map (left, below the menu) with the approved characters of the
 * current campaign. Every card opens the character form: to edit for the owner or the master, read-only
 * for the other participants.
 */
export const PartyPanel = ({ onOpen }: PartyPanelProps) => {
  const { t } = useTranslation();
  const { session } = useAuth();
  const { isMaster } = useCampaign();
  const { party, currentSelection } = useCharacter();
  const { canPlace } = useMapToken();

  if (party.length === 0) return null;

  return (
    <SidePanel
      side="left"
      title={t('party.title', { count: party.length })}
      storageKey="roll6:party-collapsed"
      collapseLabel={t('party.collapse')}
      expandLabel={t('party.expand')}
    >
      {party.map((member) => {
        const mode = participationMode(isMaster, member.characterOwnerId === session?.user.userId);
        return (
          <PartyCard
            key={member.campaignCharacterId}
            member={member}
            current={currentSelection === member.characterId}
            mode={mode}
            onOpen={() => onOpen(member, mode)}
            draggable={canPlace}
          />
        );
      })}
    </SidePanel>
  );
};

export default PartyPanel;
