import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { toast } from 'sonner';
import { useAnimation } from '../../hooks/useAnimation';
import { animationPath } from '../../lib/libraryRoutes';
import type { AnimationInfo } from '../../types/animation';
import { ConfirmModal } from '../../components/ui/ConfirmModal';
import { Tabs } from '../../components/ui/Tabs';
import { AnimationList } from '../../components/animations/AnimationList';
import { AnimationUploadForm } from '../../components/animations/AnimationUploadForm';
import { LibraryPageHeader } from '../../components/library/LibraryPageHeader';

const TABS = ['mine', 'search', 'upload'] as const;
type AnimationTab = (typeof TABS)[number];

/**
 * "Animações" of the library (087; was the animations window of 059): the user's own (edit, delete, "Editar no
 * editor"), the whole library and the upload of a `roll6-animation` file.
 */
export const AnimationsPage = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const tab: AnimationTab = (TABS as readonly string[]).includes(params.get('tab') ?? '') ? params.get('tab') as AnimationTab : 'mine';
  const { remove } = useAnimation();
  const [version, setVersion] = useState(0);
  const [deleting, setDeleting] = useState<AnimationInfo | null>(null);

  const confirmDelete = async () => {
    if (!deleting) return;
    try {
      await remove(deleting);
      toast.success(t('animations.deleted'));
      setVersion((value) => value + 1);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t('common.unknownError'));
    }
  };

  return (
    <section>
      <LibraryPageHeader title={t('library.nav.animations')} />
      <Tabs
        tabs={[
          { key: 'mine', label: t('animations.tab.mine') },
          { key: 'search', label: t('animations.tab.search') },
          { key: 'upload', label: t('animations.tab.upload') },
        ]}
        active={tab}
        onChange={(key) => setParams(key === 'mine' ? {} : { tab: key }, { replace: true })}
      />
      {tab === 'mine' && (
        <AnimationList mine version={version} onEdit={(animation) => navigate(animationPath(animation.animationId))} onDelete={setDeleting} />
      )}
      {tab === 'search' && <AnimationList mine={false} version={version} />}
      {tab === 'upload' && (
        <div className="stm-library-form">
          <AnimationUploadForm onUploaded={() => { setVersion((value) => value + 1); setParams({}, { replace: true }); }} />
        </div>
      )}
      <ConfirmModal
        open={deleting !== null}
        onOpenChange={(value) => { if (!value) setDeleting(null); }}
        title={t('animations.confirmDeleteTitle')}
        message={t('animations.confirmDelete', { name: deleting?.name ?? '' })}
        confirmLabel={t('animations.delete')}
        onConfirm={confirmDelete}
        danger
      />
    </section>
  );
};

export default AnimationsPage;
