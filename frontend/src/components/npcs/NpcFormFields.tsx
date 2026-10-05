import { lazy, Suspense, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { CharacterAvatar } from '../ui/CharacterAvatar';
import { ImageCropper } from '../ui/ImageCropper';
import type { ImageCrop } from '../ui/ImageCropper';
import { Tabs } from '../ui/Tabs';
import { TokenModal } from '../modals/TokenModal';
import { MAX_NPC_NAME, MAX_NPC_SHEET, MAX_NPC_STATUS } from '../../lib/npcForm';
import type { NpcForm } from '../../lib/npcForm';
import { POSTURES } from '../../types/mapToken';

// The markdown editor is heavy: loaded only when the form is shown.
const MarkdownEditor = lazy(() => import('../ui/MarkdownEditor'));

/** The NPC's token as shown in the form. */
export interface NpcTokenChoice {
  tokenId: number;
  name: string;
  imageUrl: string | null;
}

interface NpcFormFieldsProps {
  idPrefix: string;
  form: NpcForm;
  onField: (field: keyof NpcForm, value: string) => void;
  onImageCrop: (crop: ImageCrop | null) => void;
  /** Edit: the saved picture, shown until a new one is chosen. */
  currentImage?: { url: string | null; name: string } | null;
  onRemoveImage?: () => void;
  token: NpcTokenChoice | null;
  onToken: (token: NpcTokenChoice | null) => void;
  /** The tokens modal opened/closed: the form's modal hides meanwhile (one modal at a time). */
  onPickingTokenChange?: (picking: boolean) => void;
  /** Editing a saved NPC: the sheet opens as preview only (a new one opens with the editor). */
  editing?: boolean;
}

/**
 * Fields of an NPC, shared by "Novo NPC" and "Editar NPC", laid out like the character form: tab "Dados" (name with
 * the round picture on the same line, status with the starting posture of each new occurrence, required token picked in the tokens modal, life, energy, move) and
 * tab "Ficha" (markdown).
 */
export const NpcFormFields = ({
  idPrefix, form, onField, onImageCrop, currentImage, onRemoveImage, token, onToken, onPickingTokenChange, editing = false,
}: NpcFormFieldsProps) => {
  const { t } = useTranslation();
  const [tab, setTab] = useState('data');
  const [pickingToken, setPickingTokenState] = useState(false);
  /** A new picture is being cropped: the picture area takes the whole line. */
  const [cropping, setCropping] = useState(false);
  const setPickingToken = (picking: boolean) => {
    setPickingTokenState(picking);
    onPickingTokenChange?.(picking);
  };
  const id = (name: string) => `${idPrefix}-${name}`;

  const numberField = (field: 'life' | 'energy' | 'move') => (
    <div className="col-4">
      <label className="form-label" htmlFor={id(field)}>{t(`npcs.${field}`)}</label>
      <input id={id(field)} type="number" min={0} step={1} className="form-control" value={form[field]} onChange={(e) => onField(field, e.target.value)} />
    </div>
  );

  return (
    <>
      <Tabs
        tabs={[{ key: 'data', label: t('npcs.dataTab') }, { key: 'sheet', label: t('npcs.sheet') }]}
        active={tab}
        onChange={setTab}
      />
      {/* Tabs stay mounted (hidden) so the chosen crop and the sheet survive tab switches. */}
      <div className="row g-3" hidden={tab !== 'data'}>
        <div className="col-12">
          <div className="d-flex flex-wrap align-items-end gap-3">
            <div className="flex-grow-1" style={{ minWidth: '12rem' }}>
              <label className="form-label" htmlFor={id('name')}>{t('npcs.name')}</label>
              <input id={id('name')} className="form-control" maxLength={MAX_NPC_NAME} value={form.name} onChange={(e) => onField('name', e.target.value)} />
            </div>
            <div className={cropping ? 'w-100' : undefined}>
              <label className="form-label d-block" htmlFor={id('image')}>{t('npcs.image')}</label>
              <ImageCropper
                id={id('image')}
                compact
                onChange={onImageCrop}
                onCroppingChange={setCropping}
                hasCurrent={!!currentImage}
                currentUrl={currentImage?.url}
                currentName={currentImage?.name ?? form.name}
                onRemoveCurrent={onRemoveImage}
              />
            </div>
          </div>
        </div>
        <div className="col-sm-8">
          <label className="form-label" htmlFor={id('status')}>{t('npcs.status')}</label>
          <input id={id('status')} className="form-control" maxLength={MAX_NPC_STATUS} value={form.status} onChange={(e) => onField('status', e.target.value)} />
          <div className="form-text">{t('npcs.statusHint')}</div>
        </div>
        <div className="col-sm-4">
          <label className="form-label" htmlFor={id('posture')}>{t('posture.label')}</label>
          <select id={id('posture')} className="form-select" value={form.posture} onChange={(e) => onField('posture', e.target.value)}>
            {POSTURES.map((value) => <option key={value} value={String(value)}>{t(`posture.${value}`)}</option>)}
          </select>
          <div className="form-text">{t('npcs.postureHint')}</div>
        </div>
        <div className="col-12">
          <span className="form-label d-block">{t('npcs.token')}</span>
          <div className="d-flex align-items-center gap-2">
            {token && <CharacterAvatar name={token.name} imageUrl={token.imageUrl} size={40} />}
            <span className={token ? '' : 'text-body-secondary'}>{token ? token.name : t('npcs.noToken')}</span>
            <button type="button" className="btn btn-outline-secondary btn-sm ms-auto" onClick={() => setPickingToken(true)}>{t('npcs.chooseToken')}</button>
          </div>
        </div>
        {numberField('life')}
        {numberField('energy')}
        {numberField('move')}
      </div>
      <div hidden={tab !== 'sheet'}>
        <label className="form-label" htmlFor={id('sheet')}>{t('npcs.sheet')}</label>
        <Suspense fallback={<p className="text-body-secondary">{t('common.loading')}</p>}>
          <MarkdownEditor id={id('sheet')} value={form.sheet} onChange={(value) => onField('sheet', value)} maxLength={MAX_NPC_SHEET}
            initialMode={editing ? 'preview' : 'live'} />
        </Suspense>
        <div className="form-text">{t('characterForm.sheetHint')}</div>
      </div>
      <TokenModal
        open={pickingToken}
        onOpenChange={setPickingToken}
        onSelect={(chosen) => onToken({ tokenId: chosen.tokenId, name: chosen.name, imageUrl: chosen.upImageUrl })}
      />
    </>
  );
};

export default NpcFormFields;
