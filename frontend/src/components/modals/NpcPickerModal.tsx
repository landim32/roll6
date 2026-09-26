import { useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { Modal } from '../ui/Modal';
import { Tabs } from '../ui/Tabs';
import { CharacterAvatar } from '../ui/CharacterAvatar';
import type { ImageCrop } from '../ui/ImageCropper';
import { NpcFormFields } from '../npcs/NpcFormFields';
import type { NpcTokenChoice } from '../npcs/NpcFormFields';
import { useNpc } from '../../hooks/useNpc';
import { imageService } from '../../Services/imageService';
import { cropToFile } from '../../lib/cropImage';
import { emptyNpcForm, toNpcInsert, validateNpcForm } from '../../lib/npcForm';
import type { NpcForm } from '../../lib/npcForm';
import type { PagedList } from '../../types/common';
import type { NpcInfo } from '../../types/npc';

interface NpcPickerModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const PAGE_SIZE = 12;
const SEARCH_DELAY_MS = 300;

/** "Incluir NPC": pick one of the master's NPCs ("Meus NPCs") or create a new one ("Novo NPC"); both join the campaign. */
export const NpcPickerModal = ({ open, onOpenChange }: NpcPickerModalProps) => {
  const { t } = useTranslation();
  const { campaignNpcs, searchMyNpcs, createNpc, addToCampaign } = useNpc();
  const [tab, setTab] = useState('mine');
  const [busy, setBusy] = useState(false);
  const [query, setQuery] = useState('');
  const [debounced, setDebounced] = useState('');
  const [page, setPage] = useState(1);
  const [result, setResult] = useState<PagedList<NpcInfo> | null>(null);
  const [form, setForm] = useState<NpcForm>(emptyNpcForm);
  const [crop, setCrop] = useState<ImageCrop | null>(null);
  const [token, setToken] = useState<NpcTokenChoice | null>(null);

  useEffect(() => {
    if (!open) return;
    setTab('mine');
    setQuery('');
    setDebounced('');
    setPage(1);
    setResult(null);
    setForm(emptyNpcForm());
    setCrop(null);
    setToken(null);
  }, [open]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setDebounced(query);
      setPage(1);
    }, SEARCH_DELAY_MS);
    return () => window.clearTimeout(timer);
  }, [query]);

  useEffect(() => {
    if (!open || tab !== 'mine') return;
    let cancelled = false;
    searchMyNpcs({ search: debounced, page, pageSize: PAGE_SIZE })
      .then((list) => { if (!cancelled) setResult(list); })
      .catch((err) => { if (!cancelled) toast.error(err instanceof Error ? err.message : t('common.unknownError')); });
    return () => { cancelled = true; };
  }, [open, tab, debounced, page, searchMyNpcs, t]);

  const inCampaign = new Set(campaignNpcs.map((c) => c.npcId));

  const add = async (npc: NpcInfo) => {
    setBusy(true);
    try {
      await addToCampaign(npc.npcId);
      toast.success(t('toast.npcAdded', { name: npc.name }));
      onOpenChange(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t('common.unknownError'));
    } finally {
      setBusy(false);
    }
  };

  const onCreate = async (event: FormEvent) => {
    event.preventDefault();
    const error = validateNpcForm(form, token?.tokenId ?? null);
    if (error) return toast.error(t(`npcs.errors.${error}`));
    setBusy(true);
    try {
      const image = crop ? (await imageService.upload(await cropToFile(crop.src, crop.area, { rotation: crop.rotation, name: 'npc' }))).fileName : null;
      const npc = await createNpc(toNpcInsert(form, image, token!.tokenId));
      await addToCampaign(npc.npcId);
      toast.success(t('toast.npcCreated', { name: npc.name }));
      onOpenChange(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t('common.unknownError'));
    } finally {
      setBusy(false);
    }
  };

  const totalPages = result ? Math.max(1, Math.ceil(result.totalCount / result.pageSize)) : 1;

  return (
    <Modal
      open={open}
      onOpenChange={(next) => { if (!busy) onOpenChange(next); }}
      title={t('npcs.pickerTitle')}
      large
      footer={(
        <>
          <button type="button" className="btn btn-secondary" onClick={() => onOpenChange(false)} disabled={busy}>{t('common.cancel')}</button>
          {tab === 'new' && <button type="submit" form="npc-new-form" className="btn btn-primary" disabled={busy}>{t('common.save')}</button>}
        </>
      )}
    >
      <Tabs tabs={[{ key: 'mine', label: t('npcs.mineTab') }, { key: 'new', label: t('npcs.newTab') }]} active={tab} onChange={setTab} />
      <div hidden={tab !== 'mine'}>
        <input type="search" className="form-control mb-3" placeholder={t('npcs.search')} aria-label={t('npcs.search')}
          value={query} onChange={(e) => setQuery(e.target.value)} />
        {result === null ? <p className="text-body-secondary">{t('common.loading')}</p> : result.items.length === 0 ? (
          <p className="text-body-secondary">{t('npcs.mineEmpty')}</p>
        ) : (
          <div className="list-group">
            {result.items.map((npc) => {
              const added = inCampaign.has(npc.npcId);
              return (
                <button key={npc.npcId} type="button" className="list-group-item list-group-item-action d-flex align-items-center gap-3"
                  onClick={() => { void add(npc); }} disabled={busy || added}>
                  <CharacterAvatar name={npc.name} imageUrl={npc.imageUrl ?? npc.tokenImageUrl} size={36} />
                  <span className="flex-grow-1 text-start">
                    <span className="d-block fw-semibold">{npc.name}</span>
                    <small className="text-body-secondary">{t('npcs.stats', { life: npc.life, energy: npc.energy, move: npc.move })}</small>
                  </span>
                  {added && <span className="badge text-bg-secondary">{t('npcs.inCampaign')}</span>}
                </button>
              );
            })}
          </div>
        )}
        {result && totalPages > 1 && (
          <div className="d-flex justify-content-between align-items-center mt-3">
            <button type="button" className="btn btn-outline-secondary btn-sm" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>{t('common.previous')}</button>
            <small className="text-body-secondary">{t('common.page', { page, total: totalPages })}</small>
            <button type="button" className="btn btn-outline-secondary btn-sm" disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)}>{t('common.next')}</button>
          </div>
        )}
      </div>
      <form id="npc-new-form" hidden={tab !== 'new'} onSubmit={onCreate} noValidate>
        <NpcFormFields
          idPrefix="npc-new"
          form={form}
          onField={(field, value) => setForm((prev) => ({ ...prev, [field]: value }))}
          onImageCrop={setCrop}
          token={token}
          onToken={setToken}
        />
      </form>
    </Modal>
  );
};

export default NpcPickerModal;
