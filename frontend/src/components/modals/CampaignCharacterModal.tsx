import { lazy, Suspense, useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { Modal } from '../ui/Modal';
import { Tabs } from '../ui/Tabs';
import { CharacterAvatar } from '../ui/CharacterAvatar';
import { TokenModal } from './TokenModal';
import { SheetFileField } from '../characters/SheetFileField';
import type { SheetFileValue } from '../characters/SheetFileField';
import { SheetFileView } from '../characters/SheetFileView';
import { useCharacter } from '../../hooks/useCharacter';
import {
  MAX_CAMPAIGN_SHEET, MAX_CHARACTER_STATUS, PARTICIPATION_MODE, toCampaignUpdate, validateCampaignArea,
} from '../../lib/campaignCharacterForm';
import type { ParticipationMode } from '../../lib/campaignCharacterForm';
import { validateVitals } from '../../lib/vitals';
import type { CampaignCharacterDetailInfo, CampaignCharacterInfo } from '../../types/campaignCharacter';
import { POSTURE, POSTURES } from '../../types/mapToken';
import type { Posture } from '../../types/mapToken';

// The markdown editor/viewer are heavy: loaded only when this form is opened.
const MarkdownEditor = lazy(() => import('../ui/MarkdownEditor'));
const MarkdownView = lazy(() => import('../ui/MarkdownView'));

/** A party card opened in the form: the participation and what the user may do with it. */
export interface CharacterEditTarget {
  participation: CampaignCharacterInfo;
  mode: ParticipationMode;
}

interface CampaignCharacterModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editing: CharacterEditTarget | null;
}

/**
 * What one campaign holds about a character (032), opened from a party card: tabs "Dados" (the character's name,
 * picture and totals read-only, plus "Nesta campanha" = current life/energy, Deslocamento (037), status, posture and token),
 * "Ficha da Campanha" (this campaign's copy of the sheet) and "Ficha em arquivo" (this campaign's copy of the file).
 * The owner changes everything here and the master the campaign values, the campaign sheet and its file — the token
 * is the only character field reachable from here (011/012), so nothing of the character can be changed by mistake.
 * The character's own sheet lives in CharacterFormModal, opened from "Selecionar Personagem". Everyone else reads.
 */
export const CampaignCharacterModal = ({ open, onOpenChange, editing }: CampaignCharacterModalProps) => {
  const { t } = useTranslation();
  const { getParticipation, updateParticipation } = useCharacter();
  const [tab, setTab] = useState('data');
  const [detail, setDetail] = useState<CampaignCharacterDetailInfo | null>(null);
  const [currentLife, setCurrentLife] = useState('');
  const [currentEnergy, setCurrentEnergy] = useState('');
  /** Movement limit on this campaign's maps (037): owner and master change it, as the other campaign values. */
  const [currentMove, setCurrentMove] = useState('');
  const [characterStatus, setCharacterStatus] = useState('');
  const [posture, setPosture] = useState<Posture>(POSTURE.standing);
  const [campaignSheet, setCampaignSheet] = useState('');
  /** This campaign's sheet file (032): uploaded on choice, saved with the participation. */
  const [campaignSheetFile, setCampaignSheetFile] = useState<SheetFileValue | null>(null);
  const [uploadingSheet, setUploadingSheet] = useState(false);
  /** The character's token (011 US5): chosen here by the owner and the master, saved on the character. */
  const [token, setToken] = useState<{ tokenId: number; name: string; imageUrl: string | null } | null>(null);
  const [pickingToken, setPickingToken] = useState(false);
  const [saving, setSaving] = useState(false);

  const participationId = editing?.participation.campaignCharacterId ?? null;
  const mode = editing?.mode ?? null;
  const isViewer = mode === PARTICIPATION_MODE.viewer;

  useEffect(() => {
    if (!open || participationId === null) return;
    setTab('data');
    setDetail(null);
    setToken(null);
    setCampaignSheetFile(null);
    let cancelled = false;
    getParticipation(participationId)
      .then((participation) => {
        if (cancelled) return;
        setDetail(participation);
        setCurrentLife(String(participation.currentLife));
        setCurrentEnergy(String(participation.currentEnergy));
        setCurrentMove(String(participation.currentMove));
        setCharacterStatus(participation.characterStatus ?? '');
        setPosture(participation.posture);
        setCampaignSheet(participation.sheet ?? '');
        setCampaignSheetFile(participation.sheetFile && participation.sheetFileType
          ? { fileName: participation.sheetFile, url: participation.sheetFileUrl, type: participation.sheetFileType, originalName: null }
          : null);
        setToken(participation.characterTokenId !== null
          ? { tokenId: participation.characterTokenId, name: participation.characterTokenName ?? '', imageUrl: participation.characterTokenImageUrl }
          : null);
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

  const loading = editing !== null && detail === null;

  /**
   * Current values to save: when a total is lowered below an untouched current value the current follows the total
   * (009 FR-011); a current typed above the total is an error.
   */
  const vitalsToSave = (before: CampaignCharacterDetailInfo) => {
    const follow = (typed: string, previous: number, total: number) =>
      (Number(typed) === previous && previous > total ? String(total) : typed);
    return {
      life: follow(currentLife, before.currentLife, before.totalLife),
      energy: follow(currentEnergy, before.currentEnergy, before.totalEnergy),
    };
  };

  const onSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (loading || isViewer || uploadingSheet || !detail) return;
    const before = detail;
    const vitals = vitalsToSave(before);
    const vitalsError = validateVitals({
      currentLife: vitals.life, currentEnergy: vitals.energy, totalLife: before.totalLife, totalEnergy: before.totalEnergy,
    });
    if (vitalsError) {
      setTab('data');
      return toast.error(t(`characterForm.errors.${vitalsError}`));
    }
    const areaError = validateCampaignArea({ currentMove, characterStatus, sheet: campaignSheet });
    if (areaError) {
      setTab(areaError === 'campaignSheetTooLong' ? 'campaignSheet' : 'data');
      return toast.error(t(`characterForm.errors.${areaError}`));
    }

    setSaving(true);
    try {
      // The only call this modal makes: the character's own data is not reachable from here (032 FR-010).
      // An empty string removes this campaign's sheet file; the stored name keeps or replaces it.
      await updateParticipation(before.campaignCharacterId, toCampaignUpdate({
        currentLife: vitals.life, currentEnergy: vitals.energy, currentMove, characterStatus, sheet: campaignSheet, posture,
        tokenId: token?.tokenId ?? null, sheetFile: campaignSheetFile?.fileName ?? '',
      }));
      toast.success(t('toast.campaignCharacterUpdated', { name: before.characterName }));
      onOpenChange(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t('common.unknownError'));
    } finally {
      setSaving(false);
    }
  };

  const readOnlyField = (id: string, label: string, value: string | number) => (
    <div className="col-4">
      <label className="form-label" htmlFor={`campaign-character-${id}`}>{label}</label>
      <input id={`campaign-character-${id}`} className="form-control" value={value} readOnly disabled />
    </div>
  );

  const tabs = [
    { key: 'data', label: t('characterForm.dataTab') },
    { key: 'campaignSheet', label: t('characterForm.campaignSheetTab') },
    // Always shown: without a file of its own this campaign says so here, instead of hiding the tab (FR-025).
    { key: 'sheetFile', label: t('sheetFile.tab') },
  ];

  return (
    <Modal
      open={open}
      onOpenChange={onOpenChange}
      title={t(isViewer ? 'characterForm.viewTitle' : 'characterForm.campaignTitle')}
      large
      hidden={pickingToken}
      footer={isViewer ? (
        <button type="button" className="btn btn-secondary" onClick={() => onOpenChange(false)}>{t('common.close')}</button>
      ) : (
        <>
          <button type="button" className="btn btn-secondary" onClick={() => onOpenChange(false)} disabled={saving}>{t('common.cancel')}</button>
          <button type="submit" form="campaign-character-form" className="btn btn-primary" disabled={saving || loading || uploadingSheet}>
            {saving && <span className="spinner-border spinner-border-sm me-2" aria-hidden="true" />}
            {t('common.save')}
          </button>
        </>
      )}
    >
      {loading || !detail ? <p className="text-body-secondary">{t('common.loading')}</p> : (
        <>
          <Tabs tabs={tabs} active={tab} onChange={setTab} />
          <form id="campaign-character-form" onSubmit={onSubmit} noValidate>
            {/* Tabs stay mounted (hidden) so the campaign sheet and the chosen file survive tab switches. */}
            <div className="row g-3" hidden={tab !== 'data'}>
              <div className="col-12">
                <div className="d-flex flex-wrap align-items-end gap-3">
                  <div className="flex-grow-1" style={{ minWidth: '12rem' }}>
                    <label className="form-label" htmlFor="campaign-character-name">{t('characterForm.name')}</label>
                    <input id="campaign-character-name" className="form-control" value={detail.characterName} readOnly disabled />
                  </div>
                  <CharacterAvatar name={detail.characterName} imageUrl={detail.characterImageUrl} size={64} />
                </div>
              </div>
              <fieldset className="col-12" disabled={isViewer}>
                <legend className="fs-6 fw-semibold mb-2">{t('characterForm.campaignSection')}</legend>
                <div className="row g-3">
                  <div className="col-6 col-md-4">
                    <label className="form-label" htmlFor="campaign-character-current-life">{t('characterForm.currentLife')}</label>
                    <input id="campaign-character-current-life" type="number" step={1} className="form-control"
                      value={currentLife} onChange={(e) => setCurrentLife(e.target.value)} />
                  </div>
                  <div className="col-6 col-md-4">
                    <label className="form-label" htmlFor="campaign-character-current-energy">{t('characterForm.currentEnergy')}</label>
                    <input id="campaign-character-current-energy" type="number" step={1} className="form-control"
                      value={currentEnergy} onChange={(e) => setCurrentEnergy(e.target.value)} />
                  </div>
                  <div className="col-12 col-md-4">
                    <label className="form-label" htmlFor="campaign-character-current-move">{t('characterForm.currentMove')}</label>
                    <input id="campaign-character-current-move" type="number" min={0} step={1} className="form-control"
                      aria-describedby="campaign-character-current-move-hint"
                      value={currentMove} onChange={(e) => setCurrentMove(e.target.value)} />
                  </div>
                  <div id="campaign-character-current-move-hint" className="col-12 form-text mt-1">{t('characterForm.currentMoveHint')}</div>
                  <div className="col-sm-8">
                    <label className="form-label" htmlFor="campaign-character-status">{t('characterForm.characterStatus')}</label>
                    <input id="campaign-character-status" className="form-control" maxLength={MAX_CHARACTER_STATUS}
                      value={characterStatus} onChange={(e) => setCharacterStatus(e.target.value)} />
                  </div>
                  <div className="col-sm-4">
                    <label className="form-label" htmlFor="campaign-character-posture">{t('posture.label')}</label>
                    <select id="campaign-character-posture" className="form-select" value={posture}
                      onChange={(e) => setPosture(Number(e.target.value) as Posture)}>
                      {POSTURES.map((value) => <option key={value} value={value}>{t(`posture.${value}`)}</option>)}
                    </select>
                  </div>
                  <div className="col-12">
                    <span className="form-label d-block">{t('characterForm.token')}</span>
                    <div className="d-flex align-items-center gap-2">
                      {token && <CharacterAvatar name={token.name} imageUrl={token.imageUrl} size={40} />}
                      <span className={token ? '' : 'text-body-secondary'}>{token ? token.name : t('characterForm.noToken')}</span>
                      {!isViewer && (
                        <button type="button" className="btn btn-outline-secondary btn-sm ms-auto" onClick={() => setPickingToken(true)}>
                          {t('characterForm.chooseToken')}
                        </button>
                      )}
                    </div>
                    <div className="form-text">{t('characterForm.tokenHint')}</div>
                  </div>
                </div>
                {!isViewer && <div className="form-text">{t('characterForm.vitalsHint')}</div>}
              </fieldset>
              <fieldset className="col-12">
                <legend className="fs-6 fw-semibold mb-2">{t('characterForm.permanentSection')}</legend>
                <div className="row g-3">
                  {readOnlyField('life', t('characterForm.life'), detail.totalLife)}
                  {readOnlyField('energy', t('characterForm.energy'), detail.totalEnergy)}
                  {readOnlyField('move', t('characterForm.move'), detail.characterMove)}
                </div>
                <div className="form-text">{t('characterForm.permanentHint')} {t('characterForm.readOnlyHint')}</div>
              </fieldset>
            </div>
            <div hidden={tab !== 'campaignSheet'}>
              <Suspense fallback={<p className="text-body-secondary">{t('common.loading')}</p>}>
                {isViewer ? <MarkdownView value={campaignSheet} emptyText={t('characterForm.campaignSheetEmpty')} /> : (
                  <>
                    <label className="form-label" htmlFor="campaign-sheet">{t('characterForm.campaignSheetTab')}</label>
                    <MarkdownEditor id="campaign-sheet" value={campaignSheet} onChange={setCampaignSheet} maxLength={MAX_CAMPAIGN_SHEET}
                      placeholder={t('characterForm.campaignSheetPlaceholder')} initialMode="preview" />
                  </>
                )}
              </Suspense>
              <div className="form-text">{t('characterForm.campaignSheetHint')}</div>
            </div>
            <div hidden={tab !== 'sheetFile'}>
              {isViewer ? (
                // FR-025: this campaign has no file of its own — the character's is never shown here.
                campaignSheetFile?.url && campaignSheetFile.type
                  ? <SheetFileView url={campaignSheetFile.url} type={campaignSheetFile.type} />
                  : <p className="text-body-secondary">{t('sheetFile.noneCampaign')}</p>
              ) : (
                <>
                  <label className="form-label" htmlFor="campaign-sheet-file">{t('sheetFile.tab')}</label>
                  <SheetFileField id="campaign-sheet-file" value={campaignSheetFile} onChange={setCampaignSheetFile}
                    onUploadingChange={setUploadingSheet} />
                  {!campaignSheetFile && <div className="form-text">{t('sheetFile.noneCampaign')}</div>}
                </>
              )}
            </div>
          </form>
          <TokenModal
            open={pickingToken}
            onOpenChange={setPickingToken}
            onSelect={(chosen) => setToken({ tokenId: chosen.tokenId, name: chosen.name, imageUrl: chosen.upImageUrl })}
          />
        </>
      )}
    </Modal>
  );
};

export default CampaignCharacterModal;
