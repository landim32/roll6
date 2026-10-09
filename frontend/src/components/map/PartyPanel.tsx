import { useTranslation } from 'react-i18next';
import { PartyCard } from './PartyCard';
import { SidePanel } from './SidePanel';
import { useAuth } from '../../hooks/useAuth';
import { useCampaign } from '../../hooks/useCampaign';
import { useCharacter } from '../../hooks/useCharacter';
import { useMapToken } from '../../hooks/useMapToken';
import { PARTICIPATION_MODE, participationMode } from '../../lib/campaignCharacterForm';
import type { ParticipationMode } from '../../lib/campaignCharacterForm';
import type { CampaignCharacterInfo } from '../../types/campaignCharacter';

interface PartyPanelProps {
  onOpen: (member: CampaignCharacterInfo, mode: ParticipationMode) => void;
  /** A fixed column beside the chat instead of a panel over the map. */
  docked?: boolean;
}

/**
 * Fixed, compact panel over the map (left, below the menu) with the approved characters of the
 * current campaign. Every card opens the character form: to edit for the owner or the master, read-only
 * for the other participants.
 */
export const PartyPanel = ({ onOpen, docked = false }: PartyPanelProps) => {
  const { t } = useTranslation();
  const { session } = useAuth();
  const { isMaster } = useCampaign();
  const { party, currentSelection } = useCharacter();
  const { canPlace, canPlaceOwn } = useMapToken();

  if (party.length === 0) return null;

  return (
    <SidePanel
      docked={docked}
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
            // The master drags any card; a player only his own characters' cards.
            draggable={canPlace || (canPlaceOwn && mode === PARTICIPATION_MODE.owner)}
          />
        );
      })}
    </SidePanel>
  );
};

export default PartyPanel;
