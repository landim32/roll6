import { lazy, Suspense, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { CharacterAvatar } from '../ui/CharacterAvatar';
import { ImageCropper } from '../ui/ImageCropper';
import type { ImageCrop } from '../ui/ImageCropper';
import { TokenModal } from '../modals/TokenModal';
import { MAX_NPC_NAME, MAX_NPC_SHEET } from '../../lib/npcForm';
import type { NpcForm } from '../../lib/npcForm';

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
}

/**
 * Fields of an NPC, shared by "Novo NPC" and "Editar NPC": name, round picture, required token (picked in
 * the tokens modal), life, energy, move and the markdown sheet.
 */
export const NpcFormFields = ({ idPrefix, form, onField, onImageCrop, currentImage, onRemoveImage, token, onToken }: NpcFormFieldsProps) => {
  const { t } = useTranslation();
  const [pickingToken, setPickingToken] = useState(false);
  const id = (name: string) => `${idPrefix}-${name}`;

  const numberField = (field: 'life' | 'energy' | 'move') => (
    <div className="col-4">
      <label className="form-label" htmlFor={id(field)}>{t(`npcs.${field}`)}</label>
      <input id={id(field)} type="number" min={0} step={1} className="form-control" value={form[field]} onChange={(e) => onField(field, e.target.value)} />
    </div>
  );

  return (
    <div className="row g-3">
      <div className="col-12">
        <label className="form-label" htmlFor={id('name')}>{t('npcs.name')}</label>
        <input id={id('name')} className="form-control" maxLength={MAX_NPC_NAME} value={form.name} onChange={(e) => onField('name', e.target.value)} />
      </div>
      <div className="col-12">
        <label className="form-label" htmlFor={id('image')}>{t('npcs.image')}</label>
        <ImageCropper
          id={id('image')}
          onChange={onImageCrop}
          hasCurrent={!!currentImage}
          currentUrl={currentImage?.url}
          currentName={currentImage?.name ?? form.name}
          onRemoveCurrent={onRemoveImage}
        />
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
      <div className="col-12">
        <label className="form-label" htmlFor={id('sheet')}>{t('npcs.sheet')}</label>
        <Suspense fallback={<p className="text-body-secondary">{t('common.loading')}</p>}>
          <MarkdownEditor id={id('sheet')} value={form.sheet} onChange={(value) => onField('sheet', value)} maxLength={MAX_NPC_SHEET} height={240} />
        </Suspense>
      </div>
      <TokenModal
        open={pickingToken}
        onOpenChange={setPickingToken}
        onSelect={(chosen) => onToken({ tokenId: chosen.tokenId, name: chosen.name, imageUrl: chosen.upImageUrl })}
      />
    </div>
  );
};

export default NpcFormFields;
