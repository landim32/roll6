import * as DropdownMenu from '@radix-ui/react-dropdown-menu';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../hooks/useAuth';

interface UserMenuProps {
  onEdit: () => void;
  onChangePassword: () => void;
  onLogout: () => void;
}

/**
 * User name in the top menu opening "Editar / Trocar senha / Sair". Radix handles Esc, outside
 * click and keyboard navigation (research R1); `modal={false}` keeps it from competing with the
 * Radix Dialog opened by the items, which run after the menu closes (onSelect).
 */
export const UserMenu = ({ onEdit, onChangePassword, onLogout }: UserMenuProps) => {
  const { t } = useTranslation();
  const { session } = useAuth();

  return (
    <DropdownMenu.Root modal={false}>
      <DropdownMenu.Trigger asChild>
        <button type="button" className="btn btn-sm btn-outline-secondary dropdown-toggle stm-user-trigger"
          aria-label={t('userMenu.label')} title={session?.user.name}>
          {session?.user.name}
        </button>
      </DropdownMenu.Trigger>
      <DropdownMenu.Portal>
        <DropdownMenu.Content className="dropdown-menu show stm-user-menu" align="end" sideOffset={4}>
          <DropdownMenu.Item className="dropdown-item" onSelect={onEdit}>{t('userMenu.edit')}</DropdownMenu.Item>
          <DropdownMenu.Item className="dropdown-item" onSelect={onChangePassword}>{t('userMenu.changePassword')}</DropdownMenu.Item>
          <DropdownMenu.Separator className="dropdown-divider" />
          <DropdownMenu.Item className="dropdown-item" onSelect={onLogout}>{t('userMenu.logout')}</DropdownMenu.Item>
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  );
};

export default UserMenu;
