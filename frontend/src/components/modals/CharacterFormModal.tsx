import { lazy, Suspense, useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { Modal } from '../ui/Modal';
import { Tabs } from '../ui/Tabs';
import { CharacterAvatar } from '../ui/CharacterAvatar';
import { ImageCropper } from '../ui/ImageCropper';
import { TokenModal } from './TokenModal';
import { SheetFileField } from '../characters/SheetFileField';
import type { SheetFileValue } from '../characters/SheetFileField';
import type { ImageCrop } from '../ui/ImageCropper';
import { useCharacter } from '../../hooks/useCharacter';
import { imageService } from '../../Services/imageService';
import { cropToFile } from '../../lib/cropImage';
import {
  emptyCharacterForm, MAX_CHARACTER_NAME, MAX_CHARACTER_SHEET, toCharacterInsert, validateCharacterForm,
} from '../../lib/characterForm';
import type { CharacterForm } from '../../lib/characterForm';
import type { CharacterInfo } from '../../types/character';
import { CAMPAIGN_CHARACTER_STATUS } from '../../types/campaignCharacter';

// The markdown editor is heavy: loaded only when this form is opened.
const MarkdownEditor = lazy(() => import('../ui/MarkdownEditor'));

interface CharacterFormModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Without a character the form creates one ("Incluir Personagem"); with one, its owner edits it. */
  character?: CharacterInfo | null;
}

const toForm = (c: CharacterInfo): CharacterForm => ({
  name: c.name,
  life: String(c.life),
  energy: String(c.energy),
  move: String(c.move),
  sheet: c.sheet ?? '',
});

/**
 * The character itself (032), opened from the character combo: tabs "Dados" (name + picture on one line, token and
 * "Ficha permanente" = total life/energy and move), "Ficha" (markdown) and "Ficha em arquivo". Only the owner reaches
 * it, so every field is editable and nothing here belongs to a campaign — what a campaign holds about the character
 * lives in CampaignCharacterModal.
 * Create ("Incluir Personagem"): creates and, with a current campaign, joins it right away — approved for the master
 * (or in open campaigns), otherwise as an access request (008 FR-015/016).
 * Update replaces every field, so the token and the sheet file are seeded from the character and sent back unchanged
 * unless they are changed here.
 */
export const CharacterFormModal = ({ open, onOpenChange, character = null }: CharacterFormModalProps) => {
  const { t } = useTranslation();
  const { createCharacter, updateCharacter } = useCharacter();
  const [tab, setTab] = useState('data');
  const [form, setForm] = useState<CharacterForm>(emptyCharacterForm);
  const [crop, setCrop] = useState<ImageCrop | null>(null);
  const [saving, setSaving] = useState(false);
  /** Saved picture kept on edit (null once removed). */
  const [keptImage, setKeptImage] = useState<{ file: string; url: string | null } | null>(null);
  /** The character's token (011 US5): chosen in the tokens modal, saved with the character. */
  const [token, setToken] = useState<{ tokenId: number; name: string; imageUrl: string | null } | null>(null);
  const [pickingToken, setPickingToken] = useState(false);
  /** A new picture is being cropped: the picture area takes the whole line. */
  const [cropping, setCropping] = useState(false);
  /** The character's sheet file (022): uploaded on choice, saved with the character. */
  const [sheetFile, setSheetFile] = useState<SheetFileValue | null>(null);
  const [uploadingSheet, setUploadingSheet] = useState(false);

  const characterId = character?.characterId ?? null;

  useEffect(() => {
    if (!open) return;
    setTab('data');
    setCrop(null);
    setCropping(false);
    setForm(emptyCharacterForm());
    setKeptImage(null);
    setSheetFile(null);
    setToken(null);
    if (!character) return;
    setForm(toForm(character));
    setKeptImage(character.image ? { file: character.image, url: character.imageUrl } : null);
    setSheetFile(character.sheetFile && character.sheetFileType
      ? { fileName: character.sheetFile, url: character.sheetFileUrl, type: character.sheetFileType, originalName: null }
      : null);
    setToken(character.tokenId !== null
      ? { tokenId: character.tokenId, name: character.tokenName ?? '', imageUrl: character.tokenImageUrl }
      : null);
  // Seed once per opening/target.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, characterId]);

  const set = (field: keyof CharacterForm) => (value: string) => setForm((prev) => ({ ...prev, [field]: value }));

  const onSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (saving || uploadingSheet) return;
    const error = validateCharacterForm(form);
    if (error) {
      // Show the tab where the problem is.
      setTab(error === 'sheetTooLong' ? 'sheet' : 'data');
      return toast.error(t(`characterForm.errors.${error}`));
    }

    setSaving(true);
    try {
      const image = crop
        ? (await imageService.upload(await cropToFile(crop.src, crop.area, { rotation: crop.rotation }))).fileName
        : character ? keptImage?.file ?? null : null;
      const payload = toCharacterInsert(form, image, token?.tokenId ?? null, sheetFile?.fileName ?? null);
      if (character) {
        const updated = await updateCharacter(character.characterId, payload);
        toast.success(t('toast.characterUpdated', { name: updated.name }));
      } else {
        const { character: created, participation, requestError } = await createCharacter(payload);
        const name = created.name;
        if (requestError) toast.warning(t('toast.characterRequestFailed', { name, error: requestError }));
        else if (!participation) toast.success(t('toast.characterCreated', { name }));
        else if (participation.status === CAMPAIGN_CHARACTER_STATUS.approved) toast.success(t('toast.characterCreatedApproved', { name }));
        else toast.success(t('toast.characterCreatedRequested', { name }));
      }
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

  const tabs = [
    { key: 'data', label: t('characterForm.dataTab') },
    { key: 'sheet', label: t('characterForm.sheetTab') },
    { key: 'sheetFile', label: t('sheetFile.tab') },
  ];

  return (
    <Modal
      open={open}
      onOpenChange={onOpenChange}
      title={t(character === null ? 'characterForm.title' : 'characterForm.editTitle')}
      large
      hidden={pickingToken}
      footer={(
        <>
          <button type="button" className="btn btn-secondary" onClick={() => onOpenChange(false)} disabled={saving}>{t('common.cancel')}</button>
          <button type="submit" form="character-form" className="btn btn-primary" disabled={saving || uploadingSheet}>
            {saving && <span className="spinner-border spinner-border-sm me-2" aria-hidden="true" />}
            {t('common.save')}
          </button>
        </>
      )}
    >
      <Tabs tabs={tabs} active={tab} onChange={setTab} />
      <form id="character-form" onSubmit={onSubmit} noValidate>
        {/* Tabs stay mounted (hidden) so the chosen crop and the sheet survive tab switches. */}
        <div className="row g-3" hidden={tab !== 'data'}>
          <div className="col-12">
            <div className="d-flex flex-wrap align-items-end gap-3">
              <div className="flex-grow-1" style={{ minWidth: '12rem' }}>
                <label className="form-label" htmlFor="character-name">{t('characterForm.name')}</label>
                <input id="character-name" className="form-control" maxLength={MAX_CHARACTER_NAME} autoFocus
                  value={form.name} onChange={(e) => set('name')(e.target.value)} />
              </div>
              <div className={cropping ? 'w-100' : undefined}>
                <label className="form-label d-block" htmlFor="character-image">{t('characterForm.image')}</label>
                <ImageCropper
                  id="character-image"
                  compact
                  onChange={setCrop}
                  onCroppingChange={setCropping}
                  hasCurrent={keptImage !== null}
                  currentUrl={keptImage?.url}
                  currentName={form.name}
                  onRemoveCurrent={() => setKeptImage(null)}
                />
              </div>
            </div>
          </div>
          <div className="col-12">
            <span className="form-label d-block">{t('characterForm.token')}</span>
            <div className="d-flex align-items-center gap-2">
              {token && <CharacterAvatar name={token.name} imageUrl={token.imageUrl} size={40} />}
              <span className={token ? '' : 'text-body-secondary'}>{token ? token.name : t('characterForm.noToken')}</span>
              <button type="button" className="btn btn-outline-secondary btn-sm ms-auto" onClick={() => setPickingToken(true)}>
                {t('characterForm.chooseToken')}
              </button>
              {token && (
                <button type="button" className="btn btn-outline-danger btn-sm" onClick={() => setToken(null)}>
                  {t('characterForm.removeToken')}
                </button>
              )}
            </div>
            <div className="form-text">{t('characterForm.tokenHint')}</div>
          </div>
          <fieldset className="col-12">
            <legend className="fs-6 fw-semibold mb-2">{t('characterForm.permanentSection')}</legend>
            <div className="row g-3">
              {numberField('life')}
              {numberField('energy')}
              {numberField('move')}
            </div>
            <div className="form-text">{t('characterForm.permanentHint')}</div>
          </fieldset>
        </div>
        <div hidden={tab !== 'sheet'}>
          <label className="form-label" htmlFor="character-sheet">{t('characterForm.sheet')}</label>
          <Suspense fallback={<p className="text-body-secondary">{t('common.loading')}</p>}>
            <MarkdownEditor id="character-sheet" value={form.sheet} onChange={set('sheet')} maxLength={MAX_CHARACTER_SHEET}
              initialMode={character ? 'preview' : 'live'} />
          </Suspense>
          <div className="form-text">{t('characterForm.sheetHint')}</div>
        </div>
        <div hidden={tab !== 'sheetFile'}>
          <label className="form-label" htmlFor="character-sheet-file">{t('sheetFile.tab')}</label>
          <SheetFileField id="character-sheet-file" value={sheetFile} onChange={setSheetFile} onUploadingChange={setUploadingSheet} />
        </div>
      </form>
      <TokenModal
        open={pickingToken}
        onOpenChange={setPickingToken}
        onSelect={(chosen) => setToken({ tokenId: chosen.tokenId, name: chosen.name, imageUrl: chosen.upImageUrl })}
      />
    </Modal>
  );
};

export default CharacterFormModal;
