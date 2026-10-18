import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { useAnimation } from '../../hooks/useAnimation';
import { animationPath } from '../../lib/libraryRoutes';
import type { OwnSubsection } from '../../lib/libraryRoutes';
import type { AnimationInfo } from '../../types/animation';
import { ConfirmModal } from '../../components/ui/ConfirmModal';
import { AnimationList } from '../../components/animations/AnimationList';
import { LibraryPageHeader } from '../../components/library/LibraryPageHeader';
import { useLegacyTab } from '../../components/library/useLegacyTab';

/**
 * "Animações" of the library (087; was the animations window of 059): the user's own (edit, delete, "Editar no
 * editor") and the whole library — since 090 two submenus of cards with the standard skeleton in each animation's key
 * pose — and "Incluir animação", a page of its own like the other sections.
 */
export const AnimationsPage = ({ subsection }: { subsection: OwnSubsection }) => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  useLegacyTab('animations');
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
      <LibraryPageHeader title={t(`library.sub.animations.${subsection}`)}
        actions={<button type="button" className="btn btn-primary btn-sm" onClick={() => navigate(animationPath('new'))}>{t('animations.include')}</button>} />
      {subsection === 'mine'
        ? <AnimationList mine version={version} onEdit={(animation) => navigate(animationPath(animation.animationId))} onDelete={setDeleting} />
        : <AnimationList mine={false} version={version} />}
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
