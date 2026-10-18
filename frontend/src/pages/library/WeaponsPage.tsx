import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { toast } from 'sonner';
import { useWeapon } from '../../hooks/useWeapon';
import { weaponPath } from '../../lib/libraryRoutes';
import type { WeaponInfo } from '../../types/weapon';
import { ConfirmModal } from '../../components/ui/ConfirmModal';
import { Tabs } from '../../components/ui/Tabs';
import { WeaponList } from '../../components/weapons/WeaponList';
import { WeaponUploadForm } from '../../components/weapons/WeaponUploadForm';
import { LibraryPageHeader } from '../../components/library/LibraryPageHeader';

const TABS = ['mine', 'search', 'upload'] as const;
type WeaponTab = (typeof TABS)[number];

/**
 * "Armas" of the library (087; was the weapons window of 082): the user's own (open, delete), the whole library and
 * the upload of a `.glb`. Each weapon opens its page (edit for the owner, a look for the others).
 */
export const WeaponsPage = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const tab: WeaponTab = (TABS as readonly string[]).includes(params.get('tab') ?? '') ? params.get('tab') as WeaponTab : 'mine';
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
      <LibraryPageHeader title={t('library.nav.weapons')} />
      <Tabs
        tabs={[
          { key: 'mine', label: t('weapons.tab.mine') },
          { key: 'search', label: t('weapons.tab.search') },
          { key: 'upload', label: t('weapons.tab.upload') },
        ]}
        active={tab}
        onChange={(key) => setParams(key === 'mine' ? {} : { tab: key }, { replace: true })}
      />
      {tab === 'mine' && <WeaponList mine version={version} onPreview={open} onEdit={open} onDelete={setDeleting} />}
      {tab === 'search' && <WeaponList mine={false} version={version} onPreview={open} />}
      {tab === 'upload' && (
        <div className="stm-library-form">
          <WeaponUploadForm onUploaded={(weapon) => navigate(weaponPath(weapon.weaponId))} />
        </div>
      )}
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
