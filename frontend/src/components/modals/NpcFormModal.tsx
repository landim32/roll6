import { useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { Modal } from '../ui/Modal';
import { ConfirmModal } from '../ui/ConfirmModal';
import type { ImageCrop } from '../ui/ImageCropper';
import { NpcFormFields } from '../npcs/NpcFormFields';
import type { NpcTokenChoice } from '../npcs/NpcFormFields';
import { useNpc } from '../../hooks/useNpc';
import { imageService } from '../../Services/imageService';
import { cropToFile } from '../../lib/cropImage';
import { emptyNpcForm, toNpcForm, toNpcInsert, validateNpcForm } from '../../lib/npcForm';
import type { NpcForm } from '../../lib/npcForm';
import type { CampaignNpcInfo, NpcInfo } from '../../types/npc';

interface NpcFormModalProps {
  /** Campaign NPC whose pencil was clicked; null keeps the modal closed. */
  npc: CampaignNpcInfo | null;
  onClose: () => void;
}

/** "Editar NPC" from the NPC panel: changes the library NPC and can remove it from the campaign (with confirmation). */
export const NpcFormModal = ({ npc, onClose }: NpcFormModalProps) => {
  const { t } = useTranslation();
  const { getNpc, updateNpc, removeFromCampaign } = useNpc();
  const [saved, setSaved] = useState<NpcInfo | null>(null);
  const [form, setForm] = useState<NpcForm>(emptyNpcForm);
  const [crop, setCrop] = useState<ImageCrop | null>(null);
  const [keepImage, setKeepImage] = useState(true);
  const [token, setToken] = useState<NpcTokenChoice | null>(null);
  const [busy, setBusy] = useState(false);
  const [confirmRemove, setConfirmRemove] = useState(false);

  const npcId = npc?.npcId ?? null;

  useEffect(() => {
    if (npcId === null) return;
    setSaved(null);
    setCrop(null);
    setKeepImage(true);
    let cancelled = false;
    getNpc(npcId)
      .then((loaded) => {
        if (cancelled) return;
        setSaved(loaded);
        setForm(toNpcForm(loaded));
        setToken({ tokenId: loaded.tokenId, name: loaded.tokenName, imageUrl: loaded.tokenImageUrl });
      })
      .catch((err) => {
        if (cancelled) return;
        toast.error(err instanceof Error ? err.message : t('common.unknownError'));
        onClose();
      });
    return () => { cancelled = true; };
  // Load once per NPC.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [npcId]);

  const onSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (!saved) return;
    const error = validateNpcForm(form, token?.tokenId ?? null);
    if (error) return toast.error(t(`npcs.errors.${error}`));
    setBusy(true);
    try {
      const image = crop
        ? (await imageService.upload(await cropToFile(crop.src, crop.area, { rotation: crop.rotation, name: 'npc' }))).fileName
        : keepImage ? saved.image : null;
      const updated = await updateNpc(saved.npcId, toNpcInsert(form, image, token!.tokenId));
      toast.success(t('toast.npcUpdated', { name: updated.name }));
      onClose();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t('common.unknownError'));
    } finally {
      setBusy(false);
    }
  };

  const onConfirmRemove = async () => {
    if (!npc) return;
    try {
      await removeFromCampaign(npc.campaignNpcId);
      toast.success(t('toast.npcRemoved', { name: npc.name }));
      onClose();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t('common.unknownError'));
      throw err;
    }
  };

  return (
    <>
      <Modal
        open={npc !== null && !confirmRemove}
        onOpenChange={(next) => { if (!next && !busy) onClose(); }}
        title={t('npcs.editTitle')}
        large
        footer={(
          <>
            <button type="button" className="btn btn-outline-danger me-auto" onClick={() => setConfirmRemove(true)} disabled={busy || !saved}>{t('npcs.remove')}</button>
            <button type="button" className="btn btn-secondary" onClick={onClose} disabled={busy}>{t('common.cancel')}</button>
            <button type="submit" form="npc-edit-form" className="btn btn-primary" disabled={busy || !saved}>{t('common.save')}</button>
          </>
        )}
      >
        {!saved ? <p className="text-body-secondary">{t('common.loading')}</p> : (
          <form id="npc-edit-form" onSubmit={onSubmit} noValidate>
            <NpcFormFields
              idPrefix="npc-edit"
              form={form}
              onField={(field, value) => setForm((prev) => ({ ...prev, [field]: value }))}
              onImageCrop={setCrop}
              currentImage={keepImage && saved.image ? { url: saved.imageUrl, name: saved.name } : null}
              onRemoveImage={() => setKeepImage(false)}
              token={token}
              onToken={setToken}
            />
          </form>
        )}
      </Modal>
      <ConfirmModal
        open={confirmRemove}
        onOpenChange={setConfirmRemove}
        title={t('npcs.removeTitle')}
        message={npc ? t('npcs.removeMessage', { name: npc.name }) : ''}
        confirmLabel={t('npcs.remove')}
        onConfirm={onConfirmRemove}
        danger
      />
    </>
  );
};

export default NpcFormModal;
