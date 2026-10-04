import { useTranslation } from 'react-i18next';
import { FrontImageField } from './FrontImageField';
import { ImageCropper } from '../ui/ImageCropper';
import type { ImageCrop } from '../ui/ImageCropper';
import { tokenImageSize } from '../../lib/cropImage';
import { downImageSpace, MAX_TOKEN_DESCRIPTION, MAX_TOKEN_NAME, TOKEN_SPACES } from '../../lib/tokenForm';
import type { TokenForm } from '../../lib/tokenForm';

interface TokenFormFieldsProps {
  /** Prefix of the input ids (create and edit forms may coexist). */
  idPrefix: string;
  form: TokenForm;
  onField: (field: keyof TokenForm, value: string) => void;
  onUpCrop: (crop: ImageCrop | null) => void;
  onDownCrop: (crop: ImageCrop | null) => void;
  /** The optional "2,5D frente" image of the 3D view (034): the chosen file, uploaded as it is. */
  onFrontFile: (file: File | null) => void;
  /** Edit: the saved images, shown until new ones are chosen. */
  current?: {
    name: string; upUrl: string | null; hasUp: boolean; downUrl: string | null; hasDown: boolean;
    frontUrl: string | null; hasFront: boolean;
  };
  /** Edit: removes the saved lying image (the standing image can only be replaced). */
  onRemoveDown?: () => void;
  /** Edit: removes the saved "2,5D frente" image. */
  onRemoveFront?: () => void;
}

/**
 * Fields of a library token, shared by "Incluir token" and "Editar token": name, description, standing
 * and lying images (crop with zoom and rotation, saved at the footprint's pixel size), the optional "2,5D frente"
 * image for the 3D view and the spaces.
 */
export const TokenFormFields = ({
  idPrefix, form, onField, onUpCrop, onDownCrop, onFrontFile, current, onRemoveDown, onRemoveFront,
}: TokenFormFieldsProps) => {
  const { t } = useTranslation();
  const id = (name: string) => `${idPrefix}-${name}`;
  const upSize = tokenImageSize(Number(form.upSpace));
  const downSize = tokenImageSize(downImageSpace(form.downSpace));

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
          aspect={upSize.width / upSize.height}
          rotatable
          hint={t('tokens.cropHint', { width: upSize.width, height: upSize.height })}
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
          aspect={downSize.width / downSize.height}
          rotatable
          hint={t('tokens.cropHint', { width: downSize.width, height: downSize.height })}
          hasCurrent={current?.hasDown}
          currentUrl={current?.downUrl}
          currentName={current?.name}
          onRemoveCurrent={onRemoveDown}
        />
      </div>
      <div className="col-12">
        <label className="form-label" htmlFor={id('front-image')}>{t('tokens.frontImage')}</label>
        <FrontImageField
          id={id('front-image')}
          onChange={onFrontFile}
          hasCurrent={current?.hasFront}
          currentUrl={current?.frontUrl}
          onRemoveCurrent={onRemoveFront}
        />
      </div>
      <div className="col-6">
        <label className="form-label" htmlFor={id('up-space')}>{t('tokens.upSpace')}</label>
        <select id={id('up-space')} className="form-select" value={form.upSpace} onChange={(e) => onField('upSpace', e.target.value)}>
          {TOKEN_SPACES.map((space) => <option key={space} value={String(space)}>{t('tokens.spaceOption', { count: space })}</option>)}
        </select>
      </div>
      <div className="col-6">
        <label className="form-label" htmlFor={id('down-space')}>{t('tokens.downSpace')}</label>
        <select id={id('down-space')} className="form-select" value={form.downSpace} onChange={(e) => onField('downSpace', e.target.value)}>
          <option value="">{t('tokens.downSpaceDefault')}</option>
          {TOKEN_SPACES.map((space) => <option key={space} value={String(space)}>{t('tokens.spaceOption', { count: space })}</option>)}
        </select>
      </div>
    </div>
  );
};

export default TokenFormFields;
