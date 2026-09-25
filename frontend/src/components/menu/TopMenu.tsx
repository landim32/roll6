import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { FakeSelect } from '../ui/FakeSelect';
import { UserMenu } from './UserMenu';
import { CharacterSelect } from './CharacterSelect';
import { NotificationBell } from './NotificationBell';
import { EditUserModal } from '../modals/EditUserModal';
import { ChangePasswordModal } from '../modals/ChangePasswordModal';
import { ManageCharactersModal } from '../modals/ManageCharactersModal';
import { SelectCharacterModal } from '../modals/SelectCharacterModal';
import { CharacterFormModal } from '../modals/CharacterFormModal';
import { useAuth } from '../../hooks/useAuth';
import { useCampaign } from '../../hooks/useCampaign';
import { useMapEditor } from '../../hooks/useMapEditor';

interface TopMenuProps {
  onOpenCampaign: () => void;
  onOpenMap: () => void;
  onSave: () => void;
  /** Resolves true when it is fine to leave the current map. */
  guard: () => Promise<boolean>;
}

/**
 * Top menu: current campaign, current map, current character (with the character modals),
 * "Salvar mapa" (only when unsaved), the user submenu and the invite notifications.
 */
export const TopMenu = ({ onOpenCampaign, onOpenMap, onSave, guard }: TopMenuProps) => {
  const { t } = useTranslation();
  const { logout } = useAuth();
  const { currentCampaign, isMaster } = useCampaign();
  const { draft, isDirty, canEdit, loading } = useMapEditor();
  const [editOpen, setEditOpen] = useState(false);
  const [passwordOpen, setPasswordOpen] = useState(false);
  const [manageOpen, setManageOpen] = useState(false);
  const [selectOpen, setSelectOpen] = useState(false);
  const [includeOpen, setIncludeOpen] = useState(false);

  const onLogout = async () => {
    if (!(await guard())) return;
    logout();
    toast.info(t('toast.loggedOut'));
  };

  return (
    <header className="stm-menu">
      <span className="stm-brand me-2">{t('common.appName')}</span>
      <FakeSelect caption={t('menu.currentCampaign')} label={currentCampaign?.name ?? t('menu.chooseCampaign')} onClick={onOpenCampaign} />
      <FakeSelect caption={t('menu.currentMap')} label={draft.name || t('menu.unnamedMap')} onClick={onOpenMap} />
      <CharacterSelect
        onManage={() => setManageOpen(true)}
        onSelectCharacter={() => setSelectOpen(true)}
        onInclude={() => setIncludeOpen(true)}
      />
      {isDirty && canEdit && (
        <button type="button" className="btn btn-sm btn-warning" onClick={onSave} disabled={loading}>
          {t('menu.saveMap')}
        </button>
      )}
      <div className="ms-auto d-flex align-items-center gap-2">
        <UserMenu onEdit={() => setEditOpen(true)} onChangePassword={() => setPasswordOpen(true)} onLogout={onLogout} />
        <NotificationBell />
      </div>
      <EditUserModal open={editOpen} onOpenChange={setEditOpen} />
      <ChangePasswordModal open={passwordOpen} onOpenChange={setPasswordOpen} />
      {isMaster && <ManageCharactersModal open={manageOpen} onOpenChange={setManageOpen} />}
      <SelectCharacterModal open={selectOpen} onOpenChange={setSelectOpen} onInclude={() => setIncludeOpen(true)} />
      <CharacterFormModal open={includeOpen} onOpenChange={setIncludeOpen} />
    </header>
  );
};

export default TopMenu;
