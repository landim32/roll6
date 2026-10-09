import { useTranslation } from 'react-i18next';
import { NpcCard } from './NpcCard';
import { SidePanel } from './SidePanel';
import { useCampaign } from '../../hooks/useCampaign';
import { useMapToken } from '../../hooks/useMapToken';
import { useNpc } from '../../hooks/useNpc';
import type { CampaignNpcInfo } from '../../types/npc';

interface NpcPanelProps {
  onAdd: () => void;
  onEdit: (npc: CampaignNpcInfo) => void;
  /** A fixed column beside the chat instead of a panel over the map. */
  docked?: boolean;
}

/**
 * Right-hand panel with the NPCs of the current campaign (014). Mirrors the party panel. The master edits,
 * drags and adds NPCs ("Incluir NPC" closes the list); approved players only see the cards.
 */
export const NpcPanel = ({ onAdd, onEdit, docked = false }: NpcPanelProps) => {
  const { t } = useTranslation();
  const { currentCampaign, isMaster } = useCampaign();
  const { campaignNpcs } = useNpc();
  const { canPlace } = useMapToken();

  // Players get the list only when they may see it; with nothing to show there is no panel for them.
  if (!currentCampaign || (!isMaster && campaignNpcs.length === 0)) return null;

  return (
    <SidePanel
      docked={docked}
      side="right"
      title={t('npcs.title', { count: campaignNpcs.length })}
      storageKey="roll6:npc-collapsed"
      collapseLabel={t('npcs.collapse')}
      expandLabel={t('npcs.expand')}
      footer={isMaster
        ? <button type="button" className="btn btn-outline-primary btn-sm w-100" onClick={onAdd}>{t('npcs.add')}</button>
        : undefined}
    >
      {campaignNpcs.length === 0 && <li className="text-body-secondary small px-1">{t('npcs.empty')}</li>}
      {campaignNpcs.map((npc) => (
        <NpcCard key={npc.campaignNpcId} npc={npc} onEdit={isMaster ? () => onEdit(npc) : undefined} draggable={isMaster && canPlace} />
      ))}
    </SidePanel>
  );
};

export default NpcPanel;
