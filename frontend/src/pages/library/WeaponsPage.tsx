import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { useWeapon } from '../../hooks/useWeapon';
import { weaponPath } from '../../lib/libraryRoutes';
import type { OwnSubsection } from '../../lib/libraryRoutes';
import type { WeaponInfo } from '../../types/weapon';
import { ConfirmModal } from '../../components/ui/ConfirmModal';
import { WeaponList } from '../../components/weapons/WeaponList';
import { LibraryPageHeader } from '../../components/library/LibraryPageHeader';
import { useLegacyTab } from '../../components/library/useLegacyTab';

/**
 * "Armas" of the library (087; was the weapons window of 082): the user's own (open, delete) and the whole library —
 * since 090 two submenus of cards with the weapon's picture — and "Incluir arma", a page of its own like the other
 * sections. Each weapon opens its page (edit for the owner, a look for the others).
 */
export const WeaponsPage = ({ subsection }: { subsection: OwnSubsection }) => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  useLegacyTab('weapons');
  const { remove } = useWeapon();
  const [version, setVersion] = useState(0);
  const [deleting, setDeleting] = useState<WeaponInfo | null>(null);
  const open = (weapon: WeaponInfo) => navigate(weaponPath(weapon.weaponId));

  const confirmDelete = async () => {
    if (!deleting) return;
    try {
      await remove(deleting);
      toast.success(t('weapons.deleted'));
      setVersion((value) => value + 1);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t('common.unknownError'));
    }
  };

  return (
    <section>
      <LibraryPageHeader title={t(`library.sub.weapons.${subsection}`)}
        actions={<button type="button" className="btn btn-primary btn-sm" onClick={() => navigate(weaponPath('new'))}>{t('weapons.include')}</button>} />
      {subsection === 'mine'
        ? <WeaponList mine version={version} onPreview={open} onEdit={open} onDelete={setDeleting} />
        : <WeaponList mine={false} version={version} onPreview={open} />}
      <ConfirmModal
        open={deleting !== null}
        onOpenChange={(value) => { if (!value) setDeleting(null); }}
        title={t('weapons.confirmDeleteTitle')}
        message={t('weapons.confirmDelete', { name: deleting?.name ?? '' })}
        confirmLabel={t('weapons.delete')}
        onConfirm={confirmDelete}
        danger
      />
    </section>
  );
};

export default WeaponsPage;
