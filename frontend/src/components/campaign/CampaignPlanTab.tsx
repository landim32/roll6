import { lazy, Suspense, useCallback, useEffect, useRef, useState } from 'react';
import type { ChangeEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { ConfirmModal } from '../ui/ConfirmModal';
import { campaignPlanService } from '../../Services/campaignPlanService';
import { imageService } from '../../Services/imageService';
import { useCampaign } from '../../hooks/useCampaign';
import { insertAt, planImageMarkdown } from '../../lib/planImages';
import { isPlanDirty, PLAN_MAX_DESCRIPTION, PLAN_MAX_TITLE, validatePlan } from '../../lib/planForm';
import type { PlanDraft } from '../../lib/planForm';
import type { CampaignPlanDetailInfo, CampaignPlanInfo } from '../../types/campaignPlan';

const MarkdownEditor = lazy(() => import('../ui/MarkdownEditor'));

interface CampaignPlanTabProps {
  /** Tells the settings modal whether leaving now would lose changes. */
  onDirtyChange: (dirty: boolean) => void;
}

/** Selected entry: an existing one, a new unsaved one, or none. */
type Selection = { kind: 'none' } | { kind: 'new' } | { kind: 'plan'; id: number };

const EMPTY: PlanDraft = { title: '', description: '' };

const errorMessage = (err: unknown) => (err instanceof Error ? err.message : String(err));

const fromDetail = (plan: CampaignPlanDetailInfo): PlanDraft => ({ title: plan.title, description: plan.description ?? '' });

/**
 * "Plano" tab (018): the master's plan entries — list on the left, editor on the right. Images are uploaded and
 * inserted as `roll6-image:` references (see lib/planImages); leaving with unsaved changes asks first.
 */
export const CampaignPlanTab = ({ onDirtyChange }: CampaignPlanTabProps) => {
  const { t, i18n } = useTranslation();
  const { currentCampaign } = useCampaign();
  const campaignId = currentCampaign?.campaignId ?? null;
  const [plans, setPlans] = useState<CampaignPlanInfo[] | null>(null);
  const [selection, setSelection] = useState<Selection>({ kind: 'none' });
  const [saved, setSaved] = useState<PlanDraft>(EMPTY);
  const [draft, setDraft] = useState<PlanDraft>(EMPTY);
  const [imageUrls, setImageUrls] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [pending, setPending] = useState<(() => void) | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const cursorRef = useRef<number | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const dirty = selection.kind !== 'none' && isPlanDirty(saved, draft);
  useEffect(() => onDirtyChange(dirty), [dirty, onDirtyChange]);
  useEffect(() => () => onDirtyChange(false), [onDirtyChange]);

  const loadList = useCallback(async () => {
    if (campaignId === null) return;
    try {
      setPlans(await campaignPlanService.listByCampaign(campaignId));
    } catch (err) {
      setPlans([]);
      toast.error(errorMessage(err));
    }
  }, [campaignId]);

  useEffect(() => { void loadList(); }, [loadList]);

  /** Runs `action` now, or after confirming when there are unsaved changes. */
  const guarded = (action: () => void) => {
    if (dirty) setPending(() => action);
    else action();
  };

  const open = (id: number) => guarded(async () => {
    try {
      setBusy(true);
      const plan = await campaignPlanService.getById(id);
      setSelection({ kind: 'plan', id });
      setSaved(fromDetail(plan));
      setDraft(fromDetail(plan));
      setImageUrls(plan.imageUrls);
      cursorRef.current = null;
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setBusy(false);
    }
  });

  const startNew = () => guarded(() => {
    setSelection({ kind: 'new' });
    setSaved(EMPTY);
    setDraft(EMPTY);
    setImageUrls({});
    cursorRef.current = null;
  });

  const save = async () => {
    if (campaignId === null || selection.kind === 'none') return;
    const problem = validatePlan(draft);
    if (problem) {
      toast.error(t(problem));
      return;
    }
    const data = { title: draft.title.trim(), description: draft.description.trim() || null };
    try {
      setBusy(true);
      const plan = selection.kind === 'new'
        ? await campaignPlanService.create({ campaignId, ...data })
        : await campaignPlanService.update(selection.id, data);
      setSelection({ kind: 'plan', id: plan.campaignPlanId });
      setSaved(fromDetail(plan));
      setDraft(fromDetail(plan));
      setImageUrls((prev) => ({ ...prev, ...plan.imageUrls }));
      toast.success(t('toast.planSaved'));
      await loadList();
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  const remove = async () => {
    if (selection.kind !== 'plan') return;
    try {
      await campaignPlanService.remove(selection.id);
      toast.success(t('toast.planDeleted'));
      setSelection({ kind: 'none' });
      setSaved(EMPTY);
      setDraft(EMPTY);
      await loadList();
    } catch (err) {
      toast.error(errorMessage(err));
      throw err;
    }
  };

  const onImagePicked = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    try {
      setUploading(true);
      const uploaded = await imageService.upload(file);
      const snippet = planImageMarkdown(uploaded.fileName, file.name.replace(/\.[^.]+$/, ''));
      setDraft((prev) => ({ ...prev, description: insertAt(prev.description, cursorRef.current ?? prev.description.length, snippet) }));
      if (uploaded.url) setImageUrls((prev) => ({ ...prev, [uploaded.fileName]: uploaded.url! }));
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setUploading(false);
    }
  };

  const formatDate = (value: string) => new Date(value.endsWith('Z') ? value : `${value}Z`)
    .toLocaleString(i18n.language, { dateStyle: 'short', timeStyle: 'short' });

  const selectedId = selection.kind === 'plan' ? selection.id : null;

  return (
    <div className="stm-plan-layout">
      <aside className="stm-plan-list">
        <button type="button" className="btn btn-sm btn-primary w-100 mb-2" onClick={startNew} disabled={busy}>
          {t('campaignSettings.newPlan')}
        </button>
        {plans === null ? <p className="text-body-secondary small">{t('common.loading')}</p>
          : plans.length === 0 && selection.kind !== 'new' ? <p className="text-body-secondary small">{t('campaignSettings.noPlans')}</p>
            : (
              <div className="list-group">
                {selection.kind === 'new' && (
                  <button type="button" className="list-group-item list-group-item-action active" aria-current="true">
                    <span className="fw-semibold">{draft.title.trim() || t('campaignSettings.untitledPlan')}</span>
                  </button>
                )}
                {plans.map((plan) => (
                  <button
                    type="button"
                    key={plan.campaignPlanId}
                    className={`list-group-item list-group-item-action${plan.campaignPlanId === selectedId ? ' active' : ''}`}
                    aria-current={plan.campaignPlanId === selectedId}
                    onClick={() => { if (plan.campaignPlanId !== selectedId) open(plan.campaignPlanId); }}
                  >
                    <span className="d-block fw-semibold text-truncate" title={plan.title}>{plan.title}</span>
                    <small className="text-body-secondary">{t('campaignSettings.changedAt', { date: formatDate(plan.changedAt) })}</small>
                  </button>
                ))}
              </div>
            )}
      </aside>

      <section className="stm-plan-editor">
        {selection.kind === 'none' ? (
          <p className="text-body-secondary">{t('campaignSettings.selectPlan')}</p>
        ) : (
          <>
            <div className="mb-2">
              <label className="form-label" htmlFor="plan-title">{t('campaignSettings.planTitle')}</label>
              <input id="plan-title" className="form-control" maxLength={PLAN_MAX_TITLE} value={draft.title}
                onChange={(e) => setDraft({ ...draft, title: e.target.value })} autoFocus={selection.kind === 'new'} />
            </div>
            <div className="d-flex align-items-center justify-content-between mb-1">
              <label className="form-label mb-0" htmlFor="plan-description">{t('campaignSettings.planDescription')}</label>
              <button type="button" className="btn btn-sm btn-outline-secondary" onClick={() => fileRef.current?.click()} disabled={uploading}>
                {uploading ? t('campaignSettings.uploadingImage') : t('campaignSettings.insertImage')}
              </button>
              <input ref={fileRef} type="file" accept="image/png,image/jpeg,image/webp" hidden onChange={(e) => { void onImagePicked(e); }} />
            </div>
            <Suspense fallback={<p className="text-body-secondary">{t('common.loading')}</p>}>
              <MarkdownEditor
                id="plan-description"
                value={draft.description}
                onChange={(description) => setDraft((prev) => ({ ...prev, description }))}
                maxLength={PLAN_MAX_DESCRIPTION}
                height={380}
                imageUrls={imageUrls}
                onCursorChange={(position) => { cursorRef.current = position; }}
              />
            </Suspense>
            <div className="d-flex gap-2 justify-content-end mt-2">
              {selection.kind === 'plan' && (
                <button type="button" className="btn btn-outline-danger me-auto" onClick={() => setConfirmDelete(true)} disabled={busy}>
                  {t('campaignSettings.deletePlan')}
                </button>
              )}
              <button type="button" className="btn btn-primary" onClick={() => { void save(); }} disabled={busy || !dirty}>
                {busy ? t('common.loading') : t('common.save')}
              </button>
            </div>
          </>
        )}
      </section>

      <ConfirmModal
        open={pending !== null}
        onOpenChange={(o) => { if (!o) setPending(null); }}
        title={t('campaignSettings.discardPlan')}
        message={t('campaignSettings.discardPlanMessage')}
        confirmLabel={t('campaignSettings.discardPlan')}
        onConfirm={() => { const action = pending; setPending(null); action?.(); }}
        danger
      />
      <ConfirmModal
        open={confirmDelete}
        onOpenChange={setConfirmDelete}
        title={t('campaignSettings.deletePlan')}
        message={t('campaignSettings.deletePlanMessage', { title: saved.title })}
        confirmLabel={t('campaignSettings.deletePlan')}
        onConfirm={remove}
        danger
      />
    </div>
  );
};

export default CampaignPlanTab;
