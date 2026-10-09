import { LayoutToggle } from './LayoutToggle';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { UserMenu } from './UserMenu';
import { TableSelect } from './TableSelect';
import { CharacterSelect } from './CharacterSelect';
import { NotificationBell } from './NotificationBell';
import { TurnControls } from './TurnControls';
import { EditUserModal } from '../modals/EditUserModal';
import { ChangePasswordModal } from '../modals/ChangePasswordModal';
import { ManageCharactersModal } from '../modals/ManageCharactersModal';
import { SelectCharacterModal } from '../modals/SelectCharacterModal';
import { CharacterFormModal } from '../modals/CharacterFormModal';
import { TransferCharacterModal } from '../modals/TransferCharacterModal';
import { TurnSummaryModal } from '../modals/TurnSummaryModal';
import { CampaignSettingsModal } from '../modals/CampaignSettingsModal';
import { ApiKeysModal } from '../modals/ApiKeysModal';
import { NotificationsModal } from '../notifications/NotificationsModal';
import type { MapInfo } from '../../types/map';
import type { CharacterInfo } from '../../types/character';
import { useAuth } from '../../hooks/useAuth';
import { useCampaign } from '../../hooks/useCampaign';
import { useMapEditor } from '../../hooks/useMapEditor';
import { GearIcon } from '../ui/icons';
import { BrandLogo } from '../ui/BrandLogo';

interface TopMenuProps {
  onOpenCampaign: () => void;
  onOpenMap: () => void;
  onSave: () => void;
  /** Resolves true when it is fine to leave the current map. */
  guard: () => Promise<boolean>;
}

/**
 * Top menu: the table combo (campaign and its map, with the master's settings gear, 018), current character (with the character modals),
 * the turn ("Turno N" and, for the master, "Finalizar turno"), "Salvar mapa" (only when unsaved), the user
 * submenu and the notifications (invites and finished turns).
 */
export const TopMenu = ({ onOpenCampaign, onOpenMap, onSave, guard }: TopMenuProps) => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { logout } = useAuth();
  const { currentCampaign, isMaster } = useCampaign();
  const { isDirty, canEdit, loading } = useMapEditor();
  const [editOpen, setEditOpen] = useState(false);
  const [passwordOpen, setPasswordOpen] = useState(false);
  const [manageOpen, setManageOpen] = useState(false);
  const [selectOpen, setSelectOpen] = useState(false);
  const [includeOpen, setIncludeOpen] = useState(false);
  /** Character being edited by its owner; null while the form creates one instead (032). */
  const [editingCharacter, setEditingCharacter] = useState<CharacterInfo | null>(null);
  const [transferring, setTransferring] = useState<CharacterInfo | null>(null);
  /** Finished turn whose summary is open (from the bell). */
  const [summaryTurn, setSummaryTurn] = useState<number | null>(null);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [apiKeysOpen, setApiKeysOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);

  /** "Abrir" in the settings' Mapas tab: same as opening from the maps window (the table follows it, 017). */
  const openMapFromSettings = (map: MapInfo) => {
    navigate(`/map/${encodeURIComponent(map.slug)}`);
    setSettingsOpen(false);
    toast.success(t('toast.mapLoaded', { name: map.name }));
  };

  const onLogout = async () => {
    if (!(await guard())) return;
    logout();
    toast.info(t('toast.loggedOut'));
  };

  return (
    <header className="stm-menu">
      {/* Horizontal logo on md+, only the symbol on phones, where the first row is tight (038). */}
      <span className="stm-menu-brand me-2">
        <BrandLogo variant="horizontal" height={32} className="d-none d-md-inline-flex" />
        <BrandLogo variant="symbol" height={32} className="d-md-none" />
      </span>
      {/* Phones: the three selects wrap to a second row below this break (CSS order). */}
      <span className="stm-menu-break" aria-hidden="true" />
      <TableSelect onOpenCampaign={onOpenCampaign} onOpenMap={onOpenMap} />
      {isMaster && currentCampaign && (
        <button type="button" className="btn btn-sm btn-outline-secondary stm-settings-btn" onClick={() => setSettingsOpen(true)}
          title={t('campaignSettings.open')} aria-label={t('campaignSettings.open')}>
          <GearIcon />
        </button>
      )}
      <CharacterSelect
        onManage={() => setManageOpen(true)}
        onSelectCharacter={() => setSelectOpen(true)}
        onInclude={() => setIncludeOpen(true)}
      />
      <TurnControls />
      <LayoutToggle />
      {isDirty && canEdit && (
        <button type="button" className="btn btn-sm btn-warning" onClick={onSave} disabled={loading}>
          {t('menu.saveMap')}
        </button>
      )}
      <div className="ms-auto d-flex align-items-center gap-2">
        <UserMenu onEdit={() => setEditOpen(true)} onChangePassword={() => setPasswordOpen(true)}
          onApiKeys={() => setApiKeysOpen(true)} onNotifications={() => setNotificationsOpen(true)} onLogout={onLogout} />
        <NotificationBell onOpenTurn={setSummaryTurn} />
      </div>
      <EditUserModal open={editOpen} onOpenChange={setEditOpen} />
      <ChangePasswordModal open={passwordOpen} onOpenChange={setPasswordOpen} />
      <ApiKeysModal open={apiKeysOpen} onOpenChange={setApiKeysOpen} />
      <NotificationsModal open={notificationsOpen} onOpenChange={setNotificationsOpen} />
      {isMaster && <ManageCharactersModal open={manageOpen} onOpenChange={setManageOpen} />}
      <SelectCharacterModal open={selectOpen} onOpenChange={setSelectOpen} onInclude={() => setIncludeOpen(true)} onEdit={setEditingCharacter} onTransfer={setTransferring} />
      <TransferCharacterModal
        open={transferring !== null}
        onOpenChange={(value) => { if (!value) setTransferring(null); }}
        character={transferring}
      />
      <CharacterFormModal
        open={includeOpen || editingCharacter !== null}
        onOpenChange={(value) => { if (!value) { setIncludeOpen(false); setEditingCharacter(null); } }}
        character={editingCharacter}
      />
      <TurnSummaryModal turnNo={summaryTurn} onClose={() => setSummaryTurn(null)} />
      {isMaster && (
        <CampaignSettingsModal open={settingsOpen} onOpenChange={setSettingsOpen} onOpenMap={(map) => { void openMapFromSettings(map); }} />
      )}
    </header>
  );
};

export default TopMenu;
