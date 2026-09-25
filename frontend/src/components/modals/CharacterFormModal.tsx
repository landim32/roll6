import { lazy, Suspense, useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { Modal } from '../ui/Modal';
import { Tabs } from '../ui/Tabs';
import { ImageCropper } from '../ui/ImageCropper';
import type { ImageCrop } from '../ui/ImageCropper';
import { useCharacter } from '../../hooks/useCharacter';
import { imageService } from '../../Services/imageService';
import { cropToFile } from '../../lib/cropImage';
import {
  emptyCharacterForm, MAX_CHARACTER_NAME, MAX_CHARACTER_SHEET, MAX_CHARACTER_STATUS, toCharacterInsert, validateCharacterForm,
} from '../../lib/characterForm';
import type { CharacterForm } from '../../lib/characterForm';
import { validateVitals } from '../../lib/vitals';
import type { CharacterInfo } from '../../types/character';
import { CAMPAIGN_CHARACTER_STATUS } from '../../types/campaignCharacter';
import type { CampaignCharacterInfo } from '../../types/campaignCharacter';

// The markdown editor is heavy: loaded only when this form is opened.
const MarkdownEditor = lazy(() => import('../ui/MarkdownEditor'));

/** Edit mode: the character and its participation in the current campaign (party panel). */
export interface CharacterEditTarget {
  characterId: number;
  participation: CampaignCharacterInfo;
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
  status: c.status ?? '',
  sheet: c.sheet ?? '',
});

/**
 * Character form with tabs "Dados" (name, cropped picture, stats) and "Ficha" (markdown).
 * Create ("Incluir Personagem"): creates and, with a current campaign, joins it right away —
 * approved for the master (or in open campaigns), otherwise as an access request (008 FR-015/016).
 * Edit (party panel, owner or master): updates the character and its current life/energy in the
 * campaign (009 FR-007/010).
 */
export const CharacterFormModal = ({ open, onOpenChange, editing = null }: CharacterFormModalProps) => {
  const { t } = useTranslation();
  const { createCharacter, getCharacter, updateCharacter, updateVitals } = useCharacter();
  const [tab, setTab] = useState('data');
  const [form, setForm] = useState<CharacterForm>(emptyCharacterForm);
  const [crop, setCrop] = useState<ImageCrop | null>(null);
  const [saving, setSaving] = useState(false);
  const [original, setOriginal] = useState<CharacterInfo | null>(null);
  /** Saved picture kept on edit (null once removed). */
  const [keptImage, setKeptImage] = useState<{ file: string; url: string | null } | null>(null);
  const [currentLife, setCurrentLife] = useState('');
  const [currentEnergy, setCurrentEnergy] = useState('');

  const editingId = editing?.characterId ?? null;

  useEffect(() => {
    if (!open) return;
    setTab('data');
    setCrop(null);
    setOriginal(null);
    setKeptImage(null);
    if (editingId === null || !editing) {
      setForm(emptyCharacterForm());
      return;
    }
    setForm(emptyCharacterForm());
    setCurrentLife(String(editing.participation.currentLife));
    setCurrentEnergy(String(editing.participation.currentEnergy));
    let cancelled = false;
    getCharacter(editingId)
      .then((character) => {
        if (cancelled) return;
        setOriginal(character);
        setForm(toForm(character));
        setKeptImage(character.image ? { file: character.image, url: character.imageUrl } : null);
      })
      .catch((err) => {
        if (cancelled) return;
        toast.error(err instanceof Error ? err.message : t('common.unknownError'));
        onOpenChange(false);
      });
    return () => { cancelled = true; };
  // Load once per opening/target; the participation snapshot comes with the target.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, editingId]);

  const set = (field: keyof CharacterForm) => (value: string) => setForm((prev) => ({ ...prev, [field]: value }));

  const loadingCharacter = editing !== null && original === null;

  /**
   * Current values to save: when a total is lowered below an untouched current value the current
   * follows the total (FR-011); a current typed above the total is an error.
   */
  const vitalsToSave = (totalLife: number, totalEnergy: number) => {
    const follow = (typed: string, before: number, total: number) =>
      (Number(typed) === before && before > total ? String(total) : typed);
    return {
      life: follow(currentLife, editing!.participation.currentLife, totalLife),
      energy: follow(currentEnergy, editing!.participation.currentEnergy, totalEnergy),
    };
  };

  const onSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (loadingCharacter) return;
    const error = validateCharacterForm(form);
    if (error) {
      // Show the tab where the problem is.
      setTab(error === 'sheetTooLong' ? 'sheet' : 'data');
      return toast.error(t(`characterForm.errors.${error}`));
    }

    if (editing) {
      const draft = toCharacterInsert(form, null);
      const vitals = vitalsToSave(draft.life, draft.energy);
      const vitalsError = validateVitals({ currentLife: vitals.life, currentEnergy: vitals.energy, totalLife: draft.life, totalEnergy: draft.energy });
      if (vitalsError) {
        setTab('data');
        return toast.error(t(`characterForm.errors.${vitalsError}`));
      }
      setSaving(true);
      try {
        const image = crop ? (await imageService.upload(await cropToFile(crop.src, crop.area))).fileName : keptImage?.file ?? null;
        const character = await updateCharacter(editing.characterId, { ...draft, image });
        await updateVitals(editing.participation.campaignCharacterId, { currentLife: Number(vitals.life), currentEnergy: Number(vitals.energy) });
        toast.success(t('toast.characterUpdated', { name: character.name }));
        onOpenChange(false);
      } catch (err) {
        toast.error(err instanceof Error ? err.message : t('common.unknownError'));
      } finally {
        setSaving(false);
      }
      return;
    }

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

  return (
    <Modal
      open={open}
      onOpenChange={onOpenChange}
      title={t(editing ? 'characterForm.editTitle' : 'characterForm.title')}
      large
      footer={(
        <>
          <button type="button" className="btn btn-secondary" onClick={() => onOpenChange(false)} disabled={saving}>{t('common.cancel')}</button>
          <button type="submit" form="character-form" className="btn btn-primary" disabled={saving || loadingCharacter}>{t('common.save')}</button>
        </>
      )}
    >
      {loadingCharacter ? <p className="text-body-secondary">{t('common.loading')}</p> : (
        <>
          <Tabs
            tabs={[{ key: 'data', label: t('characterForm.dataTab') }, { key: 'sheet', label: t('characterForm.sheetTab') }]}
            active={tab}
            onChange={setTab}
          />
          <form id="character-form" onSubmit={onSubmit} noValidate>
            {/* Both tabs stay mounted (hidden) so the chosen crop and the sheet survive tab switches. */}
            <div className="row g-3" hidden={tab !== 'data'}>
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
              <div className="col-12">
                <label className="form-label" htmlFor="character-status">{t('characterForm.status')}</label>
                <input id="character-status" className="form-control" maxLength={MAX_CHARACTER_STATUS}
                  value={form.status} onChange={(e) => set('status')(e.target.value)} />
              </div>
              {editing && (
                <fieldset className="col-12">
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
                  </div>
                  <div className="form-text">{t('characterForm.vitalsHint')}</div>
                </fieldset>
              )}
            </div>
            <div hidden={tab !== 'sheet'}>
              <label className="form-label" htmlFor="character-sheet">{t('characterForm.sheet')}</label>
              <Suspense fallback={<p className="text-body-secondary">{t('common.loading')}</p>}>
                <MarkdownEditor id="character-sheet" value={form.sheet} onChange={set('sheet')} maxLength={MAX_CHARACTER_SHEET} />
              </Suspense>
              <div className="form-text">{t('characterForm.sheetHint')}</div>
            </div>
          </form>
        </>
      )}
    </Modal>
  );
};

export default CharacterFormModal;
