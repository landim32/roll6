import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useLocation, useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { useAnimation } from '../../hooks/useAnimation';
import { animationEditorPath } from '../../lib/libraryRoutes';
import type { OwnSubsection } from '../../lib/libraryRoutes';
import type { AnimationInfo } from '../../types/animation';
import { ConfirmModal } from '../../components/ui/ConfirmModal';
import { AnimationList } from '../../components/animations/AnimationList';
import { AnimationDetailsModal } from '../../components/animations/AnimationDetailsModal';
import { LibraryPageHeader } from '../../components/library/LibraryPageHeader';
import { useLegacyTab } from '../../components/library/useLegacyTab';

/**
 * "Animações" of the library (087; was the animations window of 059): the user's own (open in the editor — the only
 * page of an animation —, delete) and the whole library — since 090 two submenus of cards with the standard skeleton
 * in each animation's key pose — and "Incluir animação", a window with the name and the type that opens the new
 * animation's editor once saved (`/library/animations/new` comes here with the window open).
 */
export const AnimationsPage = ({ subsection }: { subsection: OwnSubsection }) => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  useLegacyTab('animations');
  const { remove } = useAnimation();
  const [version, setVersion] = useState(0);
  const [deleting, setDeleting] = useState<AnimationInfo | null>(null);
  const location = useLocation();
  const [including, setIncluding] = useState(() => (location.state as { include?: boolean } | null)?.include === true);
  const openEditor = (animation: AnimationInfo) => navigate(animationEditorPath(animation.animationId));

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
        actions={<button type="button" className="btn btn-primary btn-sm" onClick={() => setIncluding(true)}>{t('animations.include')}</button>} />
      {subsection === 'mine'
        ? <AnimationList mine version={version} onEdit={openEditor} onDelete={setDeleting} />
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
      <AnimationDetailsModal open={including} onOpenChange={setIncluding} animation={null}
        onSaved={(created) => navigate(animationEditorPath(created.animationId))} />
    </section>
  );
};

export default AnimationsPage;
