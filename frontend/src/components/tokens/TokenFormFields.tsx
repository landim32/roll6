import { useTranslation } from 'react-i18next';
import { ImageCropper } from '../ui/ImageCropper';
import type { ImageCrop } from '../ui/ImageCropper';
import { MAX_TOKEN_DESCRIPTION, MAX_TOKEN_NAME } from '../../lib/tokenForm';
import type { TokenForm } from '../../lib/tokenForm';

interface TokenFormFieldsProps {
  /** Prefix of the input ids (create and edit forms may coexist). */
  idPrefix: string;
  form: TokenForm;
  onField: (field: keyof TokenForm, value: string) => void;
  onUpCrop: (crop: ImageCrop | null) => void;
  onDownCrop: (crop: ImageCrop | null) => void;
  /** Edit: the saved images, shown until new ones are chosen. */
  current?: { name: string; upUrl: string | null; hasUp: boolean; downUrl: string | null; hasDown: boolean };
  /** Edit: removes the saved lying image (the standing image can only be replaced). */
  onRemoveDown?: () => void;
}

/**
 * Fields of a library token, shared by "Incluir token" and "Editar token": name, description, standing
 * and lying images (square crop with zoom and rotation, saved at 240 × 240) and the spaces.
 */
export const TokenFormFields = ({ idPrefix, form, onField, onUpCrop, onDownCrop, current, onRemoveDown }: TokenFormFieldsProps) => {
  const { t } = useTranslation();
  const id = (name: string) => `${idPrefix}-${name}`;

  return (
    <div className="row g-3">
      <div className="col-12">
        <label className="form-label" htmlFor={id('name')}>{t('tokens.name')}</label>
        <input id={id('name')} className="form-control" maxLength={MAX_TOKEN_NAME} value={form.name} onChange={(e) => onField('name', e.target.value)} />
      </div>
      <div className="col-12">
        <label className="form-label" htmlFor={id('description')}>{t('tokens.description')}</label>
        <textarea id={id('description')} className="form-control" rows={2} maxLength={MAX_TOKEN_DESCRIPTION}
          value={form.description} onChange={(e) => onField('description', e.target.value)} />
      </div>
      <div className="col-md-6">
        <label className="form-label" htmlFor={id('up-image')}>{t('tokens.upImage')}</label>
        <ImageCropper
          id={id('up-image')}
          onChange={onUpCrop}
          shape="square"
          rotatable
          hint={t('tokens.cropHint')}
          hasCurrent={current?.hasUp}
          currentUrl={current?.upUrl}
          currentName={current?.name}
        />
      </div>
      <div className="col-md-6">
        <label className="form-label" htmlFor={id('down-image')}>{t('tokens.downImage')}</label>
        <ImageCropper
          id={id('down-image')}
          onChange={onDownCrop}
          shape="square"
          rotatable
          hint={t('tokens.cropHint')}
          hasCurrent={current?.hasDown}
          currentUrl={current?.downUrl}
          currentName={current?.name}
          onRemoveCurrent={onRemoveDown}
        />
      </div>
      <div className="col-6">
        <label className="form-label" htmlFor={id('up-space')}>{t('tokens.upSpace')}</label>
        <input id={id('up-space')} type="number" min={0} step={1} className="form-control" value={form.upSpace} onChange={(e) => onField('upSpace', e.target.value)} />
      </div>
      <div className="col-6">
        <label className="form-label" htmlFor={id('down-space')}>{t('tokens.downSpace')}</label>
        <input id={id('down-space')} type="number" min={0} step={1} className="form-control" value={form.downSpace} onChange={(e) => onField('downSpace', e.target.value)} />
      </div>
    </div>
  );
};

export default TokenFormFields;
