import { useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate, useParams } from 'react-router-dom';
import { toast } from 'sonner';
import type { ImageCrop } from '../../components/ui/ImageCropper';
import { NpcFormFields } from '../../components/npcs/NpcFormFields';
import type { NpcTokenChoice } from '../../components/npcs/NpcFormFields';
import { LibraryPageHeader } from '../../components/library/LibraryPageHeader';
import { NotFoundCard } from '../../components/library/NotFoundCard';
import { useAuth } from '../../hooks/useAuth';
import { useCampaign } from '../../hooks/useCampaign';
import { useCharacter } from '../../hooks/useCharacter';
import { CampaignNpcFields } from '../../components/npcs/CampaignNpcFields';
import { NPC_CATEGORY } from '../../types/npc';
import type { NpcCategory } from '../../types/npc';
import { useLeaveGuard } from '../../hooks/useLeaveGuard';
import { useNpc } from '../../hooks/useNpc';
import { imageService } from '../../Services/imageService';
import { ApiError } from '../../Services/apiHelpers';
import { cropToFile } from '../../lib/cropImage';
import { campaignEditPath, idParam, libraryPath, npcPath } from '../../lib/libraryRoutes';
import { Link } from 'react-router-dom';
import { emptyNpcForm, toNpcForm, toNpcInsert, validateNpcForm } from '../../lib/npcForm';
import type { NpcForm } from '../../lib/npcForm';
import type { NpcInfo } from '../../types/npc';

/**
 * An NPC of the library in full screen (087; was the library part of the NPC window): picture, token, sheet, vitals
 * and initial posture. `/library/npcs/new` creates, `/library/npcs/:id` edits one of the user's own NPCs. When the NPC
 * is in the current campaign and the user is its master, "Nesta campanha" (category and an ally's master character,
 * 071) is edited here too — the NPC card's pencil opens this page; removal stays on the campaign page.
 */
export const NpcEditPage = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { id } = useParams();
  const creating = id === 'new';
  const npcId = idParam(id);
  const { session } = useAuth();
  const { getNpc, createNpc, updateNpc, campaignNpcs, updateCampaignNpc } = useNpc();
  const { currentCampaign, isMaster } = useCampaign();
  const { party } = useCharacter();
  const [classifying, setClassifying] = useState(false);
  const [saved, setSaved] = useState<NpcInfo | null>(null);
  const [state, setState] = useState<'loading' | 'ready' | 'notFound' | 'notYours'>(creating ? 'ready' : 'loading');
  const [form, setForm] = useState<NpcForm>(emptyNpcForm);
  const [crop, setCrop] = useState<ImageCrop | null>(null);
  const [keepImage, setKeepImage] = useState(true);
  const [token, setToken] = useState<NpcTokenChoice | null>(null);
  const [busy, setBusy] = useState(false);
  const [dirty, setDirty] = useState(false);
  const guard = useLeaveGuard(dirty && !busy);

  useEffect(() => {
    setCrop(null);
    setKeepImage(true);
    setDirty(false);
    if (creating) {
      setSaved(null);
      setForm(emptyNpcForm());
      setToken(null);
      setState('ready');
      return;
    }
    if (npcId === null) {
      setState('notFound');
      return;
    }
    let cancelled = false;
    setState('loading');
    getNpc(npcId)
      .then((loaded) => {
        if (cancelled) return;
        if (loaded.userId !== session?.user.userId) {
          setState('notYours');
          return;
        }
        setSaved(loaded);
        setForm(toNpcForm(loaded));
        setToken({ tokenId: loaded.tokenId, name: loaded.tokenName, imageUrl: loaded.tokenImageUrl });
        setState('ready');
      })
      .catch((err: unknown) => {
        if (!cancelled) setState(err instanceof ApiError && err.status === 403 ? 'notYours' : 'notFound');
      });
    return () => { cancelled = true; };
  }, [creating, npcId, getNpc, session?.user.userId]);

  if (state === 'notFound') return <NotFoundCard message={t('library.notFound')} backTo={libraryPath('npcs')} />;
  if (state === 'notYours') return <NotFoundCard message={t('library.npcs.notYours')} backTo={libraryPath('npcs')} />;
  if (state === 'loading') return <p className="text-body-secondary">{t('common.loading')}</p>;

  const onSubmit = async (event: FormEvent) => {
    event.preventDefault();
    const error = validateNpcForm(form, token?.tokenId ?? null);
    if (error) return toast.error(t(`npcs.errors.${error}`));
    setBusy(true);
    try {
      const image = crop
        ? (await imageService.upload(await cropToFile(crop.src, crop.area, { rotation: crop.rotation, name: 'npc' }))).fileName
        : saved && keepImage ? saved.image : null;
      const payload = toNpcInsert(form, image, token!.tokenId);
      if (saved) {
        const updated = await updateNpc(saved.npcId, payload);
        setSaved(updated);
        setCrop(null);
        setKeepImage(true);
        toast.success(t('toast.npcUpdated', { name: updated.name }));
        setDirty(false);
      } else {
        const created = await createNpc(payload);
        toast.success(t('toast.npcCreated', { name: created.name }));
        setDirty(false);
        navigate(npcPath(created.npcId), { replace: true });
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t('common.unknownError'));
    } finally {
      setBusy(false);
    }
  };

  // 071 via the NPC card (098 fix): what this NPC is in the current campaign, saved on change.
  const inCampaign = saved && isMaster ? campaignNpcs.find((c) => c.npcId === saved.npcId) ?? null : null;
  const classify = async (category: NpcCategory, master: number | null) => {
    if (!inCampaign) return;
    setClassifying(true);
    try {
      await updateCampaignNpc(inCampaign.campaignNpcId, {
        category, masterCampaignCharacterId: category === NPC_CATEGORY.ally ? master : null,
      });
      toast.success(t('toast.npcUpdated', { name: inCampaign.name }));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t('common.unknownError'));
    } finally {
      setClassifying(false);
    }
  };

  return (
    <section className="stm-library-form">
      <LibraryPageHeader
        title={saved ? saved.name : t('library.npcs.new')}
        back={{ to: libraryPath('npcs'), label: t('library.nav.npcs') }}
        actions={(
          <button type="submit" form="npc-page-form" className="btn btn-primary btn-sm" disabled={busy}>
            {busy && <span className="spinner-border spinner-border-sm me-2" aria-hidden="true" />}
            {t('common.save')}
          </button>
        )}
      />
      <form id="npc-page-form" onSubmit={onSubmit} noValidate>
        <NpcFormFields
          idPrefix="npc-page"
          form={form}
          onField={(field, value) => { setForm((prev) => ({ ...prev, [field]: value })); setDirty(true); }}
          onImageCrop={(value) => { setCrop(value); if (value) setDirty(true); }}
          currentImage={saved && keepImage && saved.image ? { url: saved.imageUrl, name: saved.name } : null}
          onRemoveImage={() => { setKeepImage(false); setDirty(true); }}
          token={token}
          onToken={(value) => { setToken(value); setDirty(true); }}
          editing={saved !== null}
        />
      </form>
      {inCampaign && currentCampaign && (
        <div className="card mt-3">
          <div className="card-body">
            <h2 className="h6 mb-1">{t('npcs.campaignSectionOf', { campaign: currentCampaign.name })}</h2>
            <p className="small text-body-secondary mb-0">{t('npcs.campaignSectionHint')}</p>
            <fieldset disabled={classifying}>
              <CampaignNpcFields
                idPrefix={`npc-page-campaign-${inCampaign.campaignNpcId}`}
                category={inCampaign.category}
                master={inCampaign.masterCampaignCharacterId}
                party={party}
                onChange={(category, master) => { void classify(category, master); }}
              />
            </fieldset>
            <Link to={campaignEditPath(currentCampaign.slug, 'npcs')} className="small d-inline-block mt-2">{t('npcs.campaignNpcsLink')}</Link>
          </div>
        </div>
      )}
      {guard}
    </section>
  );
};

export default NpcEditPage;
