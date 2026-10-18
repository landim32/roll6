import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { useAuth } from '../../hooks/useAuth';
import { LIBRARY_ROOT } from '../../lib/libraryRoutes';
import { UserMenu } from './UserMenu';
import { EditUserModal } from '../modals/EditUserModal';
import { ChangePasswordModal } from '../modals/ChangePasswordModal';
import { ApiKeysModal } from '../modals/ApiKeysModal';
import { NotificationsModal } from '../notifications/NotificationsModal';
import { ViewQualityModal } from '../story/ViewQualityModal';

interface UserMenuHostProps {
  /** Resolves true when it is fine to log out (the table passes its unsaved-map guard). */
  beforeLogout?: () => Promise<boolean>;
}

/**
 * The user menu with the windows its items open (087): the same on the table, the library and the animation editor.
 * "Biblioteca" replaced "Animações" and "Armas", which became library pages.
 */
export const UserMenuHost = ({ beforeLogout }: UserMenuHostProps) => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { logout } = useAuth();
  const [editOpen, setEditOpen] = useState(false);
  const [passwordOpen, setPasswordOpen] = useState(false);
  const [apiKeysOpen, setApiKeysOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [qualityOpen, setQualityOpen] = useState(false);

  const onLogout = async () => {
    if (beforeLogout && !(await beforeLogout())) return;
    logout();
    toast.info(t('toast.loggedOut'));
  };

  return (
    <>
      <UserMenu onEdit={() => setEditOpen(true)} onChangePassword={() => setPasswordOpen(true)}
        onApiKeys={() => setApiKeysOpen(true)} onNotifications={() => setNotificationsOpen(true)}
        onViewQuality={() => setQualityOpen(true)} onLibrary={() => navigate(LIBRARY_ROOT)}
        onLogout={() => { void onLogout(); }} />
      <EditUserModal open={editOpen} onOpenChange={setEditOpen} />
      <ChangePasswordModal open={passwordOpen} onOpenChange={setPasswordOpen} />
      <ApiKeysModal open={apiKeysOpen} onOpenChange={setApiKeysOpen} />
      <NotificationsModal open={notificationsOpen} onOpenChange={setNotificationsOpen} />
      <ViewQualityModal open={qualityOpen} onOpenChange={setQualityOpen} />
    </>
  );
};

export default UserMenuHost;
