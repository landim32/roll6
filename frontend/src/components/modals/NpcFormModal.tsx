import { useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { Modal } from '../ui/Modal';
import { ConfirmModal } from '../ui/ConfirmModal';
import type { ImageCrop } from '../ui/ImageCropper';
import { NpcFormFields } from '../npcs/NpcFormFields';
import { CampaignNpcFields } from '../npcs/CampaignNpcFields';
import { useCharacter } from '../../hooks/useCharacter';
import type { NpcTokenChoice } from '../npcs/NpcFormFields';
import { useNpc } from '../../hooks/useNpc';
import { imageService } from '../../Services/imageService';
import { cropToFile } from '../../lib/cropImage';
import { emptyNpcForm, toNpcForm, toNpcInsert, validateNpcForm } from '../../lib/npcForm';
import type { NpcForm } from '../../lib/npcForm';
import { NPC_CATEGORY } from '../../types/npc';
import type { CampaignNpcInfo, NpcCategory, NpcInfo } from '../../types/npc';

interface NpcFormModalProps {
  /** Campaign NPC whose pencil was clicked; null keeps the modal closed. */
  npc: CampaignNpcInfo | null;
  onClose: () => void;
}

/**
 * "Editar NPC" from the NPC panel: changes the library NPC and can remove it from the campaign (with confirmation).
 * Since 071 it also sets the NPC's category in this campaign and an ally's master character ("Nesta campanha").
 */
export const NpcFormModal = ({ npc, onClose }: NpcFormModalProps) => {
  const { t } = useTranslation();
  const { getNpc, updateNpc, removeFromCampaign, updateCampaignNpc } = useNpc();
  const { party } = useCharacter();
  const [category, setCategory] = useState<NpcCategory>(NPC_CATEGORY.enemy);
  const [master, setMaster] = useState<number | null>(null);
  const [saved, setSaved] = useState<NpcInfo | null>(null);
  const [pickingToken, setPickingToken] = useState(false);
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
    setCategory(npc?.category ?? NPC_CATEGORY.enemy);
    setMaster(npc?.masterCampaignCharacterId ?? null);
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
      // 071: the category and the master belong to this campaign, saved apart from the library NPC.
      if (npc && (category !== npc.category || master !== npc.masterCampaignCharacterId)) {
        await updateCampaignNpc(npc.campaignNpcId, { category, masterCampaignCharacterId: category === NPC_CATEGORY.ally ? master : null });
      }
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
        hidden={pickingToken}
        large
        footer={(
          <>
            <button type="button" className="btn btn-outline-danger me-auto" onClick={() => setConfirmRemove(true)} disabled={busy || !saved}>{t('npcs.remove')}</button>
            <button type="button" className="btn btn-secondary" onClick={onClose} disabled={busy}>{t('common.cancel')}</button>
            <button type="submit" form="npc-edit-form" className="btn btn-primary" disabled={busy || !saved}>
              {busy && <span className="spinner-border spinner-border-sm me-2" aria-hidden="true" />}
              {t('common.save')}
            </button>
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
              onPickingTokenChange={setPickingToken}
              editing
            />
            {npc && (
              <CampaignNpcFields
                idPrefix="npc-edit"
                category={category}
                master={master}
                party={party}
                onChange={(nextCategory, nextMaster) => { setCategory(nextCategory); setMaster(nextMaster); }}
              />
            )}
          </form>
        )}
      </Modal>
      <ConfirmModal
        open={confirmRemove}
        onOpenChange={setConfirmRemove}
        title={t('npcs.removeTitle')}
        message={npc ? t('npcs.removeMessage', { name: npc.name, count: npc.mapNpcCount }) : ''}
        confirmLabel={t('npcs.remove')}
        onConfirm={onConfirmRemove}
        danger
      />
    </>
  );
};

export default NpcFormModal;
