import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { SpriteImageField } from './SpriteImageField';
import { ImageCropper } from '../ui/ImageCropper';
import { Tabs } from '../ui/Tabs';
import type { ImageCrop } from '../ui/ImageCropper';
import type { SpriteImagesState } from '../../hooks/useSpriteImages';
import { tokenImageSize } from '../../lib/cropImage';
import { SPRITE_VIEWS } from '../../lib/spriteView';
import { downImageSpace, MAX_TOKEN_DESCRIPTION, MAX_TOKEN_NAME, TOKEN_SPACES } from '../../lib/tokenForm';
import type { TokenForm } from '../../lib/tokenForm';

interface TokenFormFieldsProps {
  /** Prefix of the input ids (create and edit forms may coexist). */
  idPrefix: string;
  form: TokenForm;
  onField: (field: keyof TokenForm, value: string) => void;
  onUpCrop: (crop: ImageCrop | null) => void;
  onDownCrop: (crop: ImageCrop | null) => void;
  /** The four "2,5D" images of the 3D view (035): crops, saved images and removals of the "2,5D" tab. */
  sprites: SpriteImagesState;
  /** Edit: the saved images, shown until new ones are chosen. */
  current?: {
    name: string; upUrl: string | null; hasUp: boolean; downUrl: string | null; hasDown: boolean;
  };
  /** Edit: removes the saved lying image (the standing image can only be replaced). */
  onRemoveDown?: () => void;
}

/**
 * Fields of a library token, shared by "Incluir token" and "Editar token", in two tabs: "Token" (name, description,
 * standing and lying images — crop with zoom and rotation, saved at the footprint's pixel size — and the spaces) and
 * "2,5D" (the four images the 3D view draws, one per side of the character). Both panels stay mounted and the inactive
 * one is hidden, so nothing is lost when the user switches: texts, chosen files and open crops (FR-005).
 */
export const TokenFormFields = ({
  idPrefix, form, onField, onUpCrop, onDownCrop, sprites, current, onRemoveDown,
}: TokenFormFieldsProps) => {
  const { t } = useTranslation();
  const [tab, setTab] = useState('token');
  const id = (name: string) => `${idPrefix}-${name}`;
  const upSize = tokenImageSize(Number(form.upSpace));
  const downSize = tokenImageSize(downImageSpace(form.downSpace));

  return (
    <>
      <Tabs
        tabs={[
          { key: 'token', label: t('tokens.tabToken') },
          { key: 'sprites', label: t('tokens.tabSprites') },
        ]}
        active={tab}
        onChange={setTab}
      />
      <div hidden={tab !== 'token'}>
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
      </div>
      <div hidden={tab !== 'sprites'}>
        <div className="form-text mb-3">{t('tokens.spritesHelp')}</div>
        <div className="stm-sprite-grid">
          {SPRITE_VIEWS.map((view) => (
            <SpriteImageField
              key={view}
              id={id(`sprite-${view}`)}
              view={view}
              onChange={(crop) => sprites.setCrop(view, crop)}
              hasCurrent={sprites.has(view)}
              currentUrl={sprites.savedUrls[view]}
              currentName={current?.name ?? form.name}
              onRemoveCurrent={() => sprites.remove(view)}
            />
          ))}
        </div>
      </div>
    </>
  );
};

export default TokenFormFields;
