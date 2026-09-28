import { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Modal } from '../ui/Modal';
import { Tabs } from '../ui/Tabs';
import { ConfirmModal } from '../ui/ConfirmModal';
import { ManageCharactersPanel } from '../campaign/ManageCharactersPanel';
import { CampaignNpcsTab } from '../campaign/CampaignNpcsTab';
import { CampaignMapsTab } from '../campaign/CampaignMapsTab';
import { CampaignPlanTab } from '../campaign/CampaignPlanTab';
import { useCampaign } from '../../hooks/useCampaign';
import type { MapInfo } from '../../types/map';

interface CampaignSettingsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Opens a campaign map from the "Mapas" tab (the caller checks unsaved changes). */
  onOpenMap: (map: MapInfo) => void;
}

const TABS = ['characters', 'npcs', 'maps', 'plan'] as const;
type SettingsTab = (typeof TABS)[number];

/** localStorage key of the last tab used in the campaign settings. */
const TAB_STORAGE_KEY = 'roll6:settings-tab';

const readTab = (): SettingsTab => {
  try {
    const stored = localStorage.getItem(TAB_STORAGE_KEY);
    return (TABS as readonly string[]).includes(stored ?? '') ? stored as SettingsTab : 'characters';
  } catch {
    return 'characters';
  }
};

/**
 * Campaign settings (018), master only: characters, NPCs, maps and the plan in one window. Leaving the plan with
 * unsaved changes (another tab or closing) asks first.
 */
export const CampaignSettingsModal = ({ open, onOpenChange, onOpenMap }: CampaignSettingsModalProps) => {
  const { t } = useTranslation();
  const { currentCampaign } = useCampaign();
  const [tab, setTab] = useState<SettingsTab>(readTab);
  const [planDirty, setPlanDirty] = useState(false);
  const [pending, setPending] = useState<(() => void) | null>(null);
  const campaignId = currentCampaign?.campaignId ?? null;

  // Another campaign (or none): the window belongs to the previous one.
  useEffect(() => {
    onOpenChange(false);
  // eslint-disable-next-line react-hooks/exhaustive-deps -- only when the campaign changes
  }, [campaignId]);

  const guarded = (action: () => void) => {
    if (planDirty) setPending(() => action);
    else action();
  };

  const selectTab = (key: string) => {
    if (key === tab) return;
    guarded(() => {
      setTab(key as SettingsTab);
      try { localStorage.setItem(TAB_STORAGE_KEY, key); } catch { /* not remembered */ }
    });
  };

  const onDirtyChange = useCallback((dirty: boolean) => setPlanDirty(dirty), []);

  return (
    <>
      <Modal
        open={open && currentCampaign !== null}
        onOpenChange={(value) => { if (value) onOpenChange(true); else guarded(() => onOpenChange(false)); }}
        title={t('campaignSettings.title', { name: currentCampaign?.name ?? '' })}
        wide
      >
        <Tabs
          tabs={[
            { key: 'characters', label: t('campaignSettings.tabCharacters') },
            { key: 'npcs', label: t('campaignSettings.tabNpcs') },
            { key: 'maps', label: t('campaignSettings.tabMaps') },
            { key: 'plan', label: t('campaignSettings.tabPlan') },
          ]}
          active={tab}
          onChange={selectTab}
        />
        <div className="stm-settings-body">
          {tab === 'characters' && <ManageCharactersPanel active={open} />}
          {tab === 'npcs' && <CampaignNpcsTab />}
          {tab === 'maps' && <CampaignMapsTab onOpenMap={(map) => guarded(() => onOpenMap(map))} />}
          {tab === 'plan' && <CampaignPlanTab onDirtyChange={onDirtyChange} />}
        </div>
      </Modal>
      <ConfirmModal
        open={pending !== null}
        onOpenChange={(o) => { if (!o) setPending(null); }}
        title={t('campaignSettings.discardPlan')}
        message={t('campaignSettings.discardPlanMessage')}
        confirmLabel={t('campaignSettings.discardPlan')}
        onConfirm={() => { const action = pending; setPending(null); setPlanDirty(false); action?.(); }}
        danger
      />
    </>
  );
};

export default CampaignSettingsModal;
