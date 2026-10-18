import { lazy, Suspense, useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { toast } from 'sonner';
import { Tabs } from '../../components/ui/Tabs';
import { CharacterAvatar } from '../../components/ui/CharacterAvatar';
import { ImageCropper } from '../../components/ui/ImageCropper';
import type { ImageCrop } from '../../components/ui/ImageCropper';
import { TokenModal } from '../../components/modals/TokenModal';
import { TransferCharacterModal } from '../../components/modals/TransferCharacterModal';
import { SheetFileField } from '../../components/characters/SheetFileField';
import type { SheetFileValue } from '../../components/characters/SheetFileField';
import { LibraryPageHeader } from '../../components/library/LibraryPageHeader';
import { NotFoundCard } from '../../components/library/NotFoundCard';
import { TransferIcon } from '../../components/ui/icons';
import { useCharacter } from '../../hooks/useCharacter';
import { useLeaveGuard } from '../../hooks/useLeaveGuard';
import { imageService } from '../../Services/imageService';
import { cropToFile } from '../../lib/cropImage';
import {
  emptyCharacterForm, MAX_CHARACTER_NAME, MAX_CHARACTER_SHEET, toCharacterInsert, validateCharacterForm,
} from '../../lib/characterForm';
import type { CharacterForm } from '../../lib/characterForm';
import { characterPath, idParam, libraryPath } from '../../lib/libraryRoutes';
import type { CharacterInfo } from '../../types/character';
import { CAMPAIGN_CHARACTER_STATUS } from '../../types/campaignCharacter';

// The markdown editor is heavy: loaded only when this page is opened.
const MarkdownEditor = lazy(() => import('../../components/ui/MarkdownEditor'));

const TABS = ['data', 'sheet', 'sheetFile'] as const;

const toForm = (c: CharacterInfo): CharacterForm => ({
  name: c.name,
  life: String(c.life),
  energy: String(c.energy),
  move: String(c.move),
  sheet: c.sheet ?? '',
});

/**
 * The character in full screen (087; was the character window of 032): `/library/characters/new` creates it (and,
 * with a current campaign, joins it as before), `/library/characters/:id` edits one of the user's own characters —
 * tabs Dados (name, picture, token, "Ficha permanente"), Ficha (markdown) and Ficha em arquivo. Update replaces every
 * field, so the token and the sheet file are seeded from the character and sent back unchanged unless changed here.
 */
export const CharacterEditPage = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { id } = useParams();
  const [params, setParams] = useSearchParams();
  const tab = (TABS as readonly string[]).includes(params.get('tab') ?? '') ? params.get('tab')! : 'data';
  const characterId = idParam(id);
  const creating = id === 'new';
  const { myCharacters, loading, refresh, createCharacter, updateCharacter } = useCharacter();
  const character = characterId === null ? null : myCharacters.find((c) => c.characterId === characterId) ?? null;

  const [form, setForm] = useState<CharacterForm>(emptyCharacterForm);
  const [crop, setCrop] = useState<ImageCrop | null>(null);
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [keptImage, setKeptImage] = useState<{ file: string; url: string | null } | null>(null);
  const [token, setToken] = useState<{ tokenId: number; name: string; imageUrl: string | null } | null>(null);
  const [pickingToken, setPickingToken] = useState(false);
  const [cropping, setCropping] = useState(false);
  const [sheetFile, setSheetFile] = useState<SheetFileValue | null>(null);
  const [uploadingSheet, setUploadingSheet] = useState(false);
  const [transferring, setTransferring] = useState(false);
  const [seededFor, setSeededFor] = useState<number | 'new' | null>(null);
  const guard = useLeaveGuard(dirty && !saving);

  useEffect(() => { void refresh(); }, [refresh]);

  // Seed once per character (or once for "new").
  useEffect(() => {
    const key = creating ? 'new' : character?.characterId ?? null;
    if (key === null || key === seededFor) return;
    setSeededFor(key);
    setCrop(null);
    setCropping(false);
    setDirty(false);
    if (!character) {
      setForm(emptyCharacterForm());
      setKeptImage(null);
      setSheetFile(null);
      setToken(null);
      return;
    }
    setForm(toForm(character));
    setKeptImage(character.image ? { file: character.image, url: character.imageUrl } : null);
    setSheetFile(character.sheetFile && character.sheetFileType
      ? { fileName: character.sheetFile, url: character.sheetFileUrl, type: character.sheetFileType, originalName: null }
      : null);
    setToken(character.tokenId !== null
      ? { tokenId: character.tokenId, name: character.tokenName ?? '', imageUrl: character.tokenImageUrl }
      : null);
  }, [creating, character, seededFor]);

  if (!creating && characterId === null) return <NotFoundCard message={t('library.notFound')} backTo={libraryPath('characters')} />;
  if (!creating && !character) {
    return loading || seededFor === null && myCharacters.length === 0
      ? <p className="text-body-secondary">{t('common.loading')}</p>
      : <NotFoundCard message={t('library.characters.notYours')} backTo={libraryPath('characters')} />;
  }

  const change = () => setDirty(true);
  const set = (field: keyof CharacterForm) => (value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    change();
  };
  const selectTab = (key: string) => setParams(key === 'data' ? {} : { tab: key }, { replace: true });

  const onSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (saving || uploadingSheet) return;
    const error = validateCharacterForm(form);
    if (error) {
      selectTab(error === 'sheetTooLong' ? 'sheet' : 'data');
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
        setDirty(false);
        setCrop(null);
        setSeededFor(null);
      } else {
        const { character: created, participation, requestError } = await createCharacter(payload);
        const name = created.name;
        if (requestError) toast.warning(t('toast.characterRequestFailed', { name, error: requestError }));
        else if (!participation) toast.success(t('toast.characterCreated', { name }));
        else if (participation.status === CAMPAIGN_CHARACTER_STATUS.approved) toast.success(t('toast.characterCreatedApproved', { name }));
        else toast.success(t('toast.characterCreatedRequested', { name }));
        setDirty(false);
        navigate(characterPath(created.characterId), { replace: true });
      }
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
    <section className="stm-library-form">
      <LibraryPageHeader
        title={character ? character.name : t('characterForm.title')}
        back={{ to: libraryPath('characters'), label: t('library.nav.characters') }}
        actions={(
          <>
            {character && (
              <button type="button" className="btn btn-outline-secondary btn-sm d-inline-flex align-items-center gap-1" onClick={() => setTransferring(true)}>
                <TransferIcon size={14} />{t('transfer.action')}
              </button>
            )}
            <button type="submit" form="character-form" className="btn btn-primary btn-sm" disabled={saving || uploadingSheet}>
              {saving && <span className="spinner-border spinner-border-sm me-2" aria-hidden="true" />}
              {t('common.save')}
            </button>
          </>
        )}
      />
      <Tabs
        tabs={[
          { key: 'data', label: t('characterForm.dataTab') },
          { key: 'sheet', label: t('characterForm.sheetTab') },
          { key: 'sheetFile', label: t('sheetFile.tab') },
        ]}
        active={tab}
        onChange={selectTab}
      />
      <form id="character-form" onSubmit={onSubmit} noValidate>
        {/* Tabs stay mounted (hidden) so the chosen crop and the sheet survive tab switches. */}
        <div className="row g-3" hidden={tab !== 'data'}>
          <div className="col-12">
            <div className="d-flex flex-wrap align-items-end gap-3">
              <div className="flex-grow-1" style={{ minWidth: '12rem' }}>
                <label className="form-label" htmlFor="character-name">{t('characterForm.name')}</label>
                <input id="character-name" className="form-control" maxLength={MAX_CHARACTER_NAME} autoFocus={creating}
                  value={form.name} onChange={(e) => set('name')(e.target.value)} />
              </div>
              <div className={cropping ? 'w-100' : undefined}>
                <label className="form-label d-block" htmlFor="character-image">{t('characterForm.image')}</label>
                <ImageCropper
                  id="character-image"
                  compact
                  onChange={(value) => { setCrop(value); if (value) change(); }}
                  onCroppingChange={setCropping}
                  hasCurrent={keptImage !== null}
                  currentUrl={keptImage?.url}
                  currentName={form.name}
                  onRemoveCurrent={() => { setKeptImage(null); change(); }}
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
                <button type="button" className="btn btn-outline-danger btn-sm" onClick={() => { setToken(null); change(); }}>
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
          <SheetFileField id="character-sheet-file" value={sheetFile} onChange={(value) => { setSheetFile(value); change(); }}
            onUploadingChange={setUploadingSheet} />
        </div>
      </form>
      <TokenModal
        open={pickingToken}
        onOpenChange={setPickingToken}
        onSelect={(chosen) => { setToken({ tokenId: chosen.tokenId, name: chosen.name, imageUrl: chosen.upImageUrl }); change(); }}
      />
      <TransferCharacterModal
        open={transferring}
        onOpenChange={(value) => {
          setTransferring(value);
          // A finished transfer takes the character out of the user's list: back to it.
          if (!value && character && !myCharacters.some((c) => c.characterId === character.characterId)) navigate(libraryPath('characters'));
        }}
        character={transferring ? character : null}
      />
      {guard}
    </section>
  );
};

export default CharacterEditPage;
