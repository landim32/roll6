import { lazy, Suspense, useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { Modal } from '../ui/Modal';
import { Tabs } from '../ui/Tabs';
import { CharacterAvatar } from '../ui/CharacterAvatar';
import { ImageCropper } from '../ui/ImageCropper';
import type { ImageCrop } from '../ui/ImageCropper';
import { useCharacter } from '../../hooks/useCharacter';
import { imageService } from '../../Services/imageService';
import { cropToFile } from '../../lib/cropImage';
import {
  emptyCharacterForm, MAX_CHARACTER_NAME, MAX_CHARACTER_SHEET, toCharacterInsert, validateCharacterForm,
} from '../../lib/characterForm';
import type { CharacterForm } from '../../lib/characterForm';
import {
  MAX_CAMPAIGN_SHEET, MAX_CHARACTER_STATUS, PARTICIPATION_MODE, toCampaignUpdate, validateCampaignArea,
} from '../../lib/campaignCharacterForm';
import type { ParticipationMode } from '../../lib/campaignCharacterForm';
import { validateVitals } from '../../lib/vitals';
import type { CharacterInfo } from '../../types/character';
import { CAMPAIGN_CHARACTER_STATUS } from '../../types/campaignCharacter';
import type { CampaignCharacterDetailInfo, CampaignCharacterInfo } from '../../types/campaignCharacter';

// The markdown editor/viewer are heavy: loaded only when this form is opened.
const MarkdownEditor = lazy(() => import('../ui/MarkdownEditor'));
const MarkdownView = lazy(() => import('../ui/MarkdownView'));

/** A party card opened in the form: the participation and what the user may do with it. */
export interface CharacterEditTarget {
  participation: CampaignCharacterInfo;
  mode: ParticipationMode;
}

interface CharacterFormModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editing?: CharacterEditTarget | null;
}

const toForm = (c: CharacterInfo): CharacterForm => ({
  name: c.name,
  life: String(c.life),
  energy: String(c.energy),
  move: String(c.move),
  sheet: c.sheet ?? '',
});

/**
 * Character form with tabs "Dados" (name, cropped picture, stats), "Ficha" (markdown) and, from a
 * party card, "Ficha da campanha".
 * Create ("Incluir Personagem"): creates and, with a current campaign, joins it right away —
 * approved for the master (or in open campaigns), otherwise as an access request (008 FR-015/016).
 * Party card (010): the owner changes the character and its data in the campaign; the master only
 * the campaign data (current life/energy, status, campaign sheet); other participants only read.
 */
export const CharacterFormModal = ({ open, onOpenChange, editing = null }: CharacterFormModalProps) => {
  const { t } = useTranslation();
  const { createCharacter, getCharacter, updateCharacter, getParticipation, updateParticipation } = useCharacter();
  const [tab, setTab] = useState('data');
  const [form, setForm] = useState<CharacterForm>(emptyCharacterForm);
  const [crop, setCrop] = useState<ImageCrop | null>(null);
  const [saving, setSaving] = useState(false);
  const [original, setOriginal] = useState<CharacterInfo | null>(null);
  const [detail, setDetail] = useState<CampaignCharacterDetailInfo | null>(null);
  /** Saved picture kept on edit (null once removed). */
  const [keptImage, setKeptImage] = useState<{ file: string; url: string | null } | null>(null);
  const [currentLife, setCurrentLife] = useState('');
  const [currentEnergy, setCurrentEnergy] = useState('');
  const [characterStatus, setCharacterStatus] = useState('');
  const [campaignSheet, setCampaignSheet] = useState('');

  const participationId = editing?.participation.campaignCharacterId ?? null;
  const mode = editing?.mode ?? null;
  const isOwner = mode === PARTICIPATION_MODE.owner;
  const isViewer = mode === PARTICIPATION_MODE.viewer;
  /** The character's own fields are editable when creating or for the owner. */
  const characterEditable = editing === null || isOwner;

  useEffect(() => {
    if (!open) return;
    setTab('data');
    setCrop(null);
    setOriginal(null);
    setDetail(null);
    setKeptImage(null);
    setForm(emptyCharacterForm());
    if (!editing) return;
    let cancelled = false;
    const loadCharacter = isOwner ? getCharacter(editing.participation.characterId) : Promise.resolve(null);
    Promise.all([getParticipation(editing.participation.campaignCharacterId), loadCharacter])
      .then(([participation, character]) => {
        if (cancelled) return;
        setDetail(participation);
        setCurrentLife(String(participation.currentLife));
        setCurrentEnergy(String(participation.currentEnergy));
        setCharacterStatus(participation.characterStatus ?? '');
        setCampaignSheet(participation.sheet ?? '');
        if (character) {
          setOriginal(character);
          setForm(toForm(character));
          setKeptImage(character.image ? { file: character.image, url: character.imageUrl } : null);
        }
      })
      .catch((err) => {
        if (cancelled) return;
        toast.error(err instanceof Error ? err.message : t('common.unknownError'));
        onOpenChange(false);
      });
    return () => { cancelled = true; };
  // Load once per opening/target.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, participationId, mode]);

  const set = (field: keyof CharacterForm) => (value: string) => setForm((prev) => ({ ...prev, [field]: value }));

  const loading = editing !== null && (detail === null || (isOwner && original === null));

  /**
   * Current values to save: when the owner lowers a total below an untouched current value the
   * current follows the total (009 FR-011); a current typed above the total is an error.
   */
  const vitalsToSave = (before: CampaignCharacterDetailInfo, totalLife: number, totalEnergy: number) => {
    const follow = (typed: string, previous: number, total: number) =>
      (Number(typed) === previous && previous > total ? String(total) : typed);
    return {
      life: follow(currentLife, before.currentLife, totalLife),
      energy: follow(currentEnergy, before.currentEnergy, totalEnergy),
    };
  };

  const saveParticipation = async (before: CampaignCharacterDetailInfo) => {
    const draft = isOwner ? toCharacterInsert(form, null) : null;
    const totalLife = draft?.life ?? before.totalLife;
    const totalEnergy = draft?.energy ?? before.totalEnergy;
    const vitals = vitalsToSave(before, totalLife, totalEnergy);
    const vitalsError = validateVitals({ currentLife: vitals.life, currentEnergy: vitals.energy, totalLife, totalEnergy });
    if (vitalsError) {
      setTab('data');
      return toast.error(t(`characterForm.errors.${vitalsError}`));
    }
    const areaError = validateCampaignArea({ characterStatus, sheet: campaignSheet });
    if (areaError) {
      setTab(areaError === 'campaignSheetTooLong' ? 'campaignSheet' : 'data');
      return toast.error(t(`characterForm.errors.${areaError}`));
    }

    setSaving(true);
    try {
      let name = before.characterName;
      if (draft) {
        const image = crop ? (await imageService.upload(await cropToFile(crop.src, crop.area))).fileName : keptImage?.file ?? null;
        name = (await updateCharacter(before.characterId, { ...draft, image })).name;
      }
      await updateParticipation(before.campaignCharacterId, toCampaignUpdate({
        currentLife: vitals.life, currentEnergy: vitals.energy, characterStatus, sheet: campaignSheet,
      }));
      toast.success(t('toast.characterUpdated', { name }));
      onOpenChange(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t('common.unknownError'));
    } finally {
      setSaving(false);
    }
  };

  const onSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (loading || isViewer) return;
    if (characterEditable) {
      const error = validateCharacterForm(form);
      if (error) {
        // Show the tab where the problem is.
        setTab(error === 'sheetTooLong' ? 'sheet' : 'data');
        return toast.error(t(`characterForm.errors.${error}`));
      }
    }

    if (detail) return saveParticipation(detail);

    setSaving(true);
    try {
      const image = crop ? (await imageService.upload(await cropToFile(crop.src, crop.area))).fileName : null;
      const { character, participation, requestError } = await createCharacter(toCharacterInsert(form, image));
      const name = character.name;
      if (requestError) toast.warning(t('toast.characterRequestFailed', { name, error: requestError }));
      else if (!participation) toast.success(t('toast.characterCreated', { name }));
      else if (participation.status === CAMPAIGN_CHARACTER_STATUS.approved) toast.success(t('toast.characterCreatedApproved', { name }));
      else toast.success(t('toast.characterCreatedRequested', { name }));
      onOpenChange(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t('common.unknownError'));
    } finally {
      setSaving(false);
    }
  };

  const numberField = (field: 'life' | 'energy' | 'move') => (
    <div className="col-4">
      <label className="form-label" htmlFor={`character-${field}`}>{t(`characterForm.${field}`)}</label>
      <input id={`character-${field}`} type="number" min={0} step={1} className="form-control"
        value={form[field]} onChange={(e) => set(field)(e.target.value)} />
    </div>
  );

  /** The character's data as read by the master or another participant (from the participation). */
  const readOnlyField = (id: string, label: string, value: string | number) => (
    <div className="col-4">
      <label className="form-label" htmlFor={`character-${id}`}>{label}</label>
      <input id={`character-${id}`} className="form-control" value={value} readOnly disabled />
    </div>
  );

  const tabs = [
    { key: 'data', label: t('characterForm.dataTab') },
    ...(characterEditable ? [{ key: 'sheet', label: t('characterForm.sheetTab') }] : []),
    ...(editing ? [{ key: 'campaignSheet', label: t('characterForm.campaignSheetTab') }] : []),
  ];

  const title = editing === null ? 'characterForm.title' : isViewer ? 'characterForm.viewTitle' : 'characterForm.editTitle';

  return (
    <Modal
      open={open}
      onOpenChange={onOpenChange}
      title={t(title)}
      large
      footer={isViewer ? (
        <button type="button" className="btn btn-secondary" onClick={() => onOpenChange(false)}>{t('common.close')}</button>
      ) : (
        <>
          <button type="button" className="btn btn-secondary" onClick={() => onOpenChange(false)} disabled={saving}>{t('common.cancel')}</button>
          <button type="submit" form="character-form" className="btn btn-primary" disabled={saving || loading}>{t('common.save')}</button>
        </>
      )}
    >
      {loading ? <p className="text-body-secondary">{t('common.loading')}</p> : (
        <>
          <Tabs tabs={tabs} active={tab} onChange={setTab} />
          <form id="character-form" onSubmit={onSubmit} noValidate>
            {/* Tabs stay mounted (hidden) so the chosen crop and the sheets survive tab switches. */}
            <div className="row g-3" hidden={tab !== 'data'}>
              {characterEditable ? (
                <>
                  <div className="col-12">
                    <label className="form-label" htmlFor="character-name">{t('characterForm.name')}</label>
                    <input id="character-name" className="form-control" maxLength={MAX_CHARACTER_NAME} autoFocus
                      value={form.name} onChange={(e) => set('name')(e.target.value)} />
                  </div>
                  <div className="col-12">
                    <label className="form-label" htmlFor="character-image">{t('characterForm.image')}</label>
                    <ImageCropper
                      id="character-image"
                      onChange={setCrop}
                      hasCurrent={keptImage !== null}
                      currentUrl={keptImage?.url}
                      currentName={form.name}
                      onRemoveCurrent={() => setKeptImage(null)}
                    />
                  </div>
                  {numberField('life')}
                  {numberField('energy')}
                  {numberField('move')}
                </>
              ) : detail && (
                <>
                  <div className="col-12 d-flex align-items-center gap-3">
                    <CharacterAvatar name={detail.characterName} imageUrl={detail.characterImageUrl} size={64} />
                    <div>
                      <div className="fs-5 fw-semibold">{detail.characterName}</div>
                      <div className="form-text">{t('characterForm.readOnlyHint')}</div>
                    </div>
                  </div>
                  {readOnlyField('life', t('characterForm.life'), detail.totalLife)}
                  {readOnlyField('energy', t('characterForm.energy'), detail.totalEnergy)}
                  {readOnlyField('move', t('characterForm.move'), detail.characterMove)}
                </>
              )}
              {editing && (
                <fieldset className="col-12" disabled={isViewer}>
                  <legend className="fs-6 fw-semibold mb-2">{t('characterForm.campaignSection')}</legend>
                  <div className="row g-3">
                    <div className="col-6">
                      <label className="form-label" htmlFor="character-current-life">{t('characterForm.currentLife')}</label>
                      <input id="character-current-life" type="number" step={1} className="form-control"
                        value={currentLife} onChange={(e) => setCurrentLife(e.target.value)} />
                    </div>
                    <div className="col-6">
                      <label className="form-label" htmlFor="character-current-energy">{t('characterForm.currentEnergy')}</label>
                      <input id="character-current-energy" type="number" step={1} className="form-control"
                        value={currentEnergy} onChange={(e) => setCurrentEnergy(e.target.value)} />
                    </div>
                    <div className="col-12">
                      <label className="form-label" htmlFor="character-status">{t('characterForm.characterStatus')}</label>
                      <input id="character-status" className="form-control" maxLength={MAX_CHARACTER_STATUS}
                        value={characterStatus} onChange={(e) => setCharacterStatus(e.target.value)} />
                    </div>
                  </div>
                  {!isViewer && <div className="form-text">{t('characterForm.vitalsHint')}</div>}
                </fieldset>
              )}
            </div>
            {characterEditable && (
              <div hidden={tab !== 'sheet'}>
                <label className="form-label" htmlFor="character-sheet">{t('characterForm.sheet')}</label>
                <Suspense fallback={<p className="text-body-secondary">{t('common.loading')}</p>}>
                  <MarkdownEditor id="character-sheet" value={form.sheet} onChange={set('sheet')} maxLength={MAX_CHARACTER_SHEET} />
                </Suspense>
                <div className="form-text">{t('characterForm.sheetHint')}</div>
              </div>
            )}
            {editing && (
              <div hidden={tab !== 'campaignSheet'}>
                <Suspense fallback={<p className="text-body-secondary">{t('common.loading')}</p>}>
                  {isViewer ? <MarkdownView value={campaignSheet} /> : (
                    <>
                      <label className="form-label" htmlFor="campaign-sheet">{t('characterForm.campaignSheetTab')}</label>
                      <MarkdownEditor id="campaign-sheet" value={campaignSheet} onChange={setCampaignSheet} maxLength={MAX_CAMPAIGN_SHEET} />
                    </>
                  )}
                </Suspense>
                <div className="form-text">{t('characterForm.campaignSheetHint')}</div>
              </div>
            )}
          </form>
        </>
      )}
    </Modal>
  );
};

export default CharacterFormModal;
