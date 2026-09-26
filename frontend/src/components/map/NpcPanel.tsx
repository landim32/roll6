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
}

/**
 * Right-hand panel with the NPCs of the current campaign — master only (014). Mirrors the party panel;
 * "Incluir NPC" closes the list.
 */
export const NpcPanel = ({ onAdd, onEdit }: NpcPanelProps) => {
  const { t } = useTranslation();
  const { currentCampaign, isMaster } = useCampaign();
  const { campaignNpcs } = useNpc();
  const { canPlace } = useMapToken();

  if (!isMaster || !currentCampaign) return null;

  return (
    <SidePanel
      side="right"
      title={t('npcs.title', { count: campaignNpcs.length })}
      storageKey="roll6:npc-collapsed"
      collapseLabel={t('npcs.collapse')}
      expandLabel={t('npcs.expand')}
      footer={<button type="button" className="btn btn-outline-primary btn-sm w-100" onClick={onAdd}>{t('npcs.add')}</button>}
    >
      {campaignNpcs.length === 0 && <li className="text-body-secondary small px-1">{t('npcs.empty')}</li>}
      {campaignNpcs.map((npc) => (
        <NpcCard key={npc.campaignNpcId} npc={npc} onEdit={() => onEdit(npc)} draggable={canPlace} />
      ))}
    </SidePanel>
  );
};

export default NpcPanel;
