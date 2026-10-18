import { useCallback, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { useLeaveGuard } from '../../hooks/useLeaveGuard';
import { libraryPath, weaponPath } from '../../lib/libraryRoutes';
import type { WeaponInfo } from '../../types/weapon';
import { LibraryPageHeader } from '../../components/library/LibraryPageHeader';
import { WeaponUploadForm } from '../../components/weapons/WeaponUploadForm';

/**
 * "Incluir arma" (090; was the "Enviar" tab of "Armas"): the upload form in full screen, like "Incluir token" — a
 * `.glb`, its pose and grip point, its name. Leaving with a file picked asks first; saving opens the new weapon's page.
 */
export const WeaponCreatePage = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [dirty, setDirty] = useState(false);
  const [done, setDone] = useState(false);
  const guard = useLeaveGuard(dirty && !done);
  const onDirtyChange = useCallback((value: boolean) => setDirty(value), []);

  const onUploaded = (weapon: WeaponInfo) => {
    setDone(true);
    navigate(weaponPath(weapon.weaponId), { replace: true });
  };

  return (
    <section className="stm-library-form">
      <LibraryPageHeader title={t('weapons.include')} back={{ to: libraryPath('weapons'), label: t('library.nav.weapons') }} />
      <WeaponUploadForm onUploaded={onUploaded} onDirtyChange={onDirtyChange} />
      {guard}
    </section>
  );
};

export default WeaponCreatePage;
