import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { FakeSelect } from '../ui/FakeSelect';
import { UserMenu } from './UserMenu';
import { CharacterSelect } from './CharacterSelect';
import { NotificationBell } from './NotificationBell';
import { TurnControls } from './TurnControls';
import { EditUserModal } from '../modals/EditUserModal';
import { ChangePasswordModal } from '../modals/ChangePasswordModal';
import { ManageCharactersModal } from '../modals/ManageCharactersModal';
import { SelectCharacterModal } from '../modals/SelectCharacterModal';
import { CharacterFormModal } from '../modals/CharacterFormModal';
import { TurnSummaryModal } from '../modals/TurnSummaryModal';
import { CampaignSettingsModal } from '../modals/CampaignSettingsModal';
import { ApiKeysModal } from '../modals/ApiKeysModal';
import type { MapInfo } from '../../types/map';
import { useAuth } from '../../hooks/useAuth';
import { useCampaign } from '../../hooks/useCampaign';
import { useMapEditor } from '../../hooks/useMapEditor';

const GearIcon = () => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true">
    <path d="M8 4.754a3.246 3.246 0 1 0 0 6.492 3.246 3.246 0 0 0 0-6.492M5.754 8a2.246 2.246 0 1 1 4.492 0 2.246 2.246 0 0 1-4.492 0" />
    <path d="M9.796 1.343c-.527-1.79-3.065-1.79-3.592 0l-.094.319a.873.873 0 0 1-1.255.52l-.292-.16c-1.64-.892-3.433.902-2.54 2.541l.159.292a.873.873 0 0 1-.52 1.255l-.319.094c-1.79.527-1.79 3.065 0 3.592l.319.094a.873.873 0 0 1 .52 1.255l-.16.292c-.892 1.64.901 3.434 2.541 2.54l.292-.159a.873.873 0 0 1 1.255.52l.094.319c.527 1.79 3.065 1.79 3.592 0l.094-.319a.873.873 0 0 1 1.255-.52l.292.16c1.64.893 3.434-.902 2.54-2.541l-.159-.292a.873.873 0 0 1 .52-1.255l.319-.094c1.79-.527 1.79-3.065 0-3.592l-.319-.094a.873.873 0 0 1-.52-1.255l.16-.292c.893-1.64-.902-3.433-2.541-2.54l-.292.159a.873.873 0 0 1-1.255-.52zm-2.633.283c.246-.835 1.428-.835 1.674 0l.094.319a1.873 1.873 0 0 0 2.693 1.115l.291-.16c.764-.415 1.6.42 1.184 1.185l-.159.292a1.873 1.873 0 0 0 1.116 2.692l.318.094c.835.246.835 1.428 0 1.674l-.319.094a1.873 1.873 0 0 0-1.115 2.693l.16.291c.415.764-.42 1.6-1.185 1.184l-.291-.159a1.873 1.873 0 0 0-2.693 1.116l-.094.318c-.246.835-1.428.835-1.674 0l-.094-.319a1.873 1.873 0 0 0-2.692-1.115l-.292.16c-.764.415-1.6-.42-1.184-1.185l.159-.291A1.873 1.873 0 0 0 1.945 8.93l-.319-.094c-.835-.246-.835-1.428 0-1.674l.319-.094A1.873 1.873 0 0 0 3.06 4.377l-.16-.292c-.415-.764.42-1.6 1.185-1.184l.292.159a1.873 1.873 0 0 0 2.692-1.115z" />
  </svg>
);

interface TopMenuProps {
  onOpenCampaign: () => void;
  onOpenMap: () => void;
  onSave: () => void;
  /** Resolves true when it is fine to leave the current map. */
  guard: () => Promise<boolean>;
}

/**
 * Top menu: current campaign (with the master's settings gear, 018), current map, current character (with the character modals),
 * the turn ("Turno N" and, for the master, "Finalizar turno"), "Salvar mapa" (only when unsaved), the user
 * submenu and the notifications (invites and finished turns).
 */
export const TopMenu = ({ onOpenCampaign, onOpenMap, onSave, guard }: TopMenuProps) => {
  const { t } = useTranslation();
  const { logout } = useAuth();
  const { currentCampaign, isMaster } = useCampaign();
  const { draft, isDirty, canEdit, loading, loadMapModel } = useMapEditor();
  const [editOpen, setEditOpen] = useState(false);
  const [passwordOpen, setPasswordOpen] = useState(false);
  const [manageOpen, setManageOpen] = useState(false);
  const [selectOpen, setSelectOpen] = useState(false);
  const [includeOpen, setIncludeOpen] = useState(false);
  /** Finished turn whose summary is open (from the bell). */
  const [summaryTurn, setSummaryTurn] = useState<number | null>(null);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [apiKeysOpen, setApiKeysOpen] = useState(false);

  /** "Abrir" in the settings' Mapas tab: same as opening from the maps window (the table follows it, 017). */
  const openMapFromSettings = async (map: MapInfo) => {
    if (!(await guard())) return;
    try {
      const opened = await loadMapModel(map.mapModelId, map);
      setSettingsOpen(false);
      toast.success(t('toast.mapLoaded', { name: opened.name }));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t('common.unknownError'));
    }
  };

  const onLogout = async () => {
    if (!(await guard())) return;
    logout();
    toast.info(t('toast.loggedOut'));
  };

  return (
    <header className="stm-menu">
      <span className="stm-brand me-2">{t('common.appName')}</span>
      <FakeSelect caption={t('menu.currentCampaign')} label={currentCampaign?.name ?? t('menu.chooseCampaign')} onClick={onOpenCampaign} />
      {isMaster && currentCampaign && (
        <button type="button" className="btn btn-sm btn-outline-secondary stm-settings-btn" onClick={() => setSettingsOpen(true)}
          title={t('campaignSettings.open')} aria-label={t('campaignSettings.open')}>
          <GearIcon />
        </button>
      )}
      <FakeSelect caption={t('menu.currentMap')} label={draft.name || t('menu.unnamedMap')} onClick={onOpenMap} />
      <CharacterSelect
        onManage={() => setManageOpen(true)}
        onSelectCharacter={() => setSelectOpen(true)}
        onInclude={() => setIncludeOpen(true)}
      />
      <TurnControls />
      {isDirty && canEdit && (
        <button type="button" className="btn btn-sm btn-warning" onClick={onSave} disabled={loading}>
          {t('menu.saveMap')}
        </button>
      )}
      <div className="ms-auto d-flex align-items-center gap-2">
        <UserMenu onEdit={() => setEditOpen(true)} onChangePassword={() => setPasswordOpen(true)}
          onApiKeys={() => setApiKeysOpen(true)} onLogout={onLogout} />
        <NotificationBell onOpenTurn={setSummaryTurn} />
      </div>
      <EditUserModal open={editOpen} onOpenChange={setEditOpen} />
      <ChangePasswordModal open={passwordOpen} onOpenChange={setPasswordOpen} />
      <ApiKeysModal open={apiKeysOpen} onOpenChange={setApiKeysOpen} />
      {isMaster && <ManageCharactersModal open={manageOpen} onOpenChange={setManageOpen} />}
      <SelectCharacterModal open={selectOpen} onOpenChange={setSelectOpen} onInclude={() => setIncludeOpen(true)} />
      <CharacterFormModal open={includeOpen} onOpenChange={setIncludeOpen} />
      <TurnSummaryModal turnNo={summaryTurn} onClose={() => setSummaryTurn(null)} />
      {isMaster && (
        <CampaignSettingsModal open={settingsOpen} onOpenChange={setSettingsOpen} onOpenMap={(map) => { void openMapFromSettings(map); }} />
      )}
    </header>
  );
};

export default TopMenu;
