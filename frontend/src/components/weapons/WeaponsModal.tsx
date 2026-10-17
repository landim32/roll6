import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { useWeapon } from '../../hooks/useWeapon';
import type { WeaponInfo } from '../../types/weapon';
import { ConfirmModal } from '../ui/ConfirmModal';
import { Modal } from '../ui/Modal';
import { Tabs } from '../ui/Tabs';
import { WeaponEditModal } from './WeaponEditModal';
import { WeaponList } from './WeaponList';
import { WeaponStage } from './WeaponStage';
import { WeaponUploadForm } from './WeaponUploadForm';

type Tab = 'mine' | 'search' | 'upload';

interface WeaponsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

/**
 * "Armas" (082), from the user menu: the shared weapon library — the user's own (edit, delete), the whole library, and
 * the upload of a `.glb`. Tokens with a 3D model hold them in the "Armas" tab of the token form.
 */
export const WeaponsModal = ({ open, onOpenChange }: WeaponsModalProps) => {
  const { t } = useTranslation();
  const { remove } = useWeapon();
  const [tab, setTab] = useState<Tab>('mine');
  const [version, setVersion] = useState(0);
  const [editing, setEditing] = useState<WeaponInfo | null>(null);
  const [deleting, setDeleting] = useState<WeaponInfo | null>(null);
  const [previewing, setPreviewing] = useState<WeaponInfo | null>(null);

  const changed = () => setVersion((value) => value + 1);

  const confirmDelete = async () => {
    if (!deleting) return;
    try {
      await remove(deleting);
      toast.success(t('weapons.deleted'));
      changed();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t('common.unknownError'));
    }
  };

  return (
    <>
      <Modal open={open} onOpenChange={onOpenChange} title={t('weapons.title')} large
        hidden={editing !== null || deleting !== null || previewing !== null}>
        <Tabs
          tabs={[
            { key: 'mine', label: t('weapons.tab.mine') },
            { key: 'search', label: t('weapons.tab.search') },
            { key: 'upload', label: t('weapons.tab.upload') },
          ]}
          active={tab}
          onChange={(key) => setTab(key as Tab)}
        />
        {tab === 'mine' && (
          <WeaponList mine version={version} onPreview={setPreviewing} onEdit={setEditing} onDelete={setDeleting} />
        )}
        {tab === 'search' && <WeaponList mine={false} version={version} onPreview={setPreviewing} />}
        {tab === 'upload' && <WeaponUploadForm onUploaded={() => { changed(); setTab('mine'); }} />}
      </Modal>
      <Modal open={previewing !== null} onOpenChange={(value) => { if (!value) setPreviewing(null); }}
        title={previewing?.name ?? ''}>
        {previewing && <WeaponStage url={previewing.modelFileUrl} name={previewing.name} />}
      </Modal>
      <WeaponEditModal weapon={editing} onClose={() => setEditing(null)} onSaved={changed} />
      <ConfirmModal
        open={deleting !== null}
        onOpenChange={(value) => { if (!value) setDeleting(null); }}
        title={t('weapons.confirmDeleteTitle')}
        message={t('weapons.confirmDelete', { name: deleting?.name ?? '' })}
        confirmLabel={t('weapons.delete')}
        onConfirm={confirmDelete}
        danger
      />
    </>
  );
};

export default WeaponsModal;
