import { useCallback, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { useLeaveGuard } from '../../hooks/useLeaveGuard';
import { animationPath, libraryPath } from '../../lib/libraryRoutes';
import type { AnimationInfo } from '../../types/animation';
import { LibraryPageHeader } from '../../components/library/LibraryPageHeader';
import { AnimationUploadForm } from '../../components/animations/AnimationUploadForm';

/**
 * "Incluir animação" (090; was the "Enviar" tab of "Animações"): the upload form in full screen — a `roll6-animation`
 * file checked before sending, its name and type. Leaving with a file picked asks first; saving opens its page.
 */
export const AnimationCreatePage = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [dirty, setDirty] = useState(false);
  const [done, setDone] = useState(false);
  const guard = useLeaveGuard(dirty && !done);
  const onDirtyChange = useCallback((value: boolean) => setDirty(value), []);

  const onUploaded = (animation: AnimationInfo) => {
    setDone(true);
    navigate(animationPath(animation.animationId), { replace: true });
  };

  return (
    <section className="stm-library-form">
      <LibraryPageHeader title={t('animations.include')} back={{ to: libraryPath('animations'), label: t('library.nav.animations') }} />
      <AnimationUploadForm onUploaded={onUploaded} onDirtyChange={onDirtyChange} />
      {guard}
    </section>
  );
};

export default AnimationCreatePage;
