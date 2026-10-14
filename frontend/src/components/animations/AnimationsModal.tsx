import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { useAnimation } from '../../hooks/useAnimation';
import type { AnimationInfo } from '../../types/animation';
import { ConfirmModal } from '../ui/ConfirmModal';
import { Modal } from '../ui/Modal';
import { Tabs } from '../ui/Tabs';
import { AnimationEditModal } from './AnimationEditModal';
import { AnimationList } from './AnimationList';
import { AnimationUploadForm } from './AnimationUploadForm';

type Tab = 'mine' | 'search' | 'upload';

interface AnimationsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

/**
 * "Animações" (059), from the user menu: the shared animation library — the user's own (edit, delete), the whole
 * library, and the upload of a `roll6-animation` file. Tokens pick them in the "3D" tab.
 */
export const AnimationsModal = ({ open, onOpenChange }: AnimationsModalProps) => {
  const { t } = useTranslation();
  const { remove } = useAnimation();
  const [tab, setTab] = useState<Tab>('mine');
  const [version, setVersion] = useState(0);
  const [editing, setEditing] = useState<AnimationInfo | null>(null);
  const [deleting, setDeleting] = useState<AnimationInfo | null>(null);

  const changed = () => setVersion((value) => value + 1);

  const confirmDelete = async () => {
    if (!deleting) return;
    try {
      await remove(deleting);
      toast.success(t('animations.deleted'));
      changed();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t('common.unknownError'));
    }
  };

  return (
    <>
      <Modal open={open} onOpenChange={onOpenChange} title={t('animations.title')} large
        hidden={editing !== null || deleting !== null}>
        <Tabs
          tabs={[
            { key: 'mine', label: t('animations.tab.mine') },
            { key: 'search', label: t('animations.tab.search') },
            { key: 'upload', label: t('animations.tab.upload') },
          ]}
          active={tab}
          onChange={(key) => setTab(key as Tab)}
        />
        {tab === 'mine' && <AnimationList mine version={version} onEdit={setEditing} onDelete={setDeleting} />}
        {tab === 'search' && <AnimationList mine={false} version={version} />}
        {tab === 'upload' && <AnimationUploadForm onUploaded={() => { changed(); setTab('mine'); }} />}
      </Modal>
      <AnimationEditModal animation={editing} onClose={() => setEditing(null)} onSaved={changed} />
      <ConfirmModal
        open={deleting !== null}
        onOpenChange={(value) => { if (!value) setDeleting(null); }}
        title={t('animations.confirmDeleteTitle')}
        message={t('animations.confirmDelete', { name: deleting?.name ?? '' })}
        confirmLabel={t('animations.delete')}
        onConfirm={confirmDelete}
        danger
      />
    </>
  );
};

export default AnimationsModal;
