import { useCallback, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ModelField } from './ModelField';
import { SpriteImageField } from './SpriteImageField';
import { ImageCropper } from '../ui/ImageCropper';
import { Tabs } from '../ui/Tabs';
import type { ImageCrop } from '../ui/ImageCropper';
import type { ModelFileState } from '../../hooks/useModelFile';
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
  /** The token's 3D model (055): the "3D" tab. */
  model: ModelFileState;
  /** Edit: the saved images, shown until new ones are chosen. */
  current?: {
    name: string; upUrl: string | null; hasUp: boolean; downUrl: string | null; hasDown: boolean;
  };
  /** Edit: removes the saved lying image (the standing image can only be replaced). */
  onRemoveDown?: () => void;
  /** The images can be filled from a photo of the 3D model's pose (057): only in forms that save the token. */
  canGenerate?: boolean;
}

/** A photo of the model handed to an image field (057); `key` grows with every new photo. */
interface GeneratedImage {
  url: string;
  key: number;
}

/**
 * Fields of a library token, shared by "Incluir token" and "Editar token", in two tabs: "Token" (name, description,
 * standing and lying images — crop with zoom and rotation, saved at the footprint's pixel size — and the spaces) and
 * "2,5D" (the four images the 3D view draws, one per side of the character) and "3D" (a `.glb` model the 3D view draws
 * instead, 055). The panels stay mounted and the inactive ones are hidden, so nothing is lost when the user switches:
 * texts, chosen files and open crops (FR-005).
 */
export const TokenFormFields = ({
  idPrefix, form, onField, onUpCrop, onDownCrop, sprites, model, current, onRemoveDown, canGenerate = false,
}: TokenFormFieldsProps) => {
  const { t } = useTranslation();
  const [tab, setTab] = useState('token');
  const id = (name: string) => `${idPrefix}-${name}`;
  const upSize = tokenImageSize(Number(form.upSpace));
  const downSize = tokenImageSize(downImageSpace(form.downSpace));
  // Photos of the model's pose (057). The cropper that receives one owns its object URL (and revokes it).
  const [generated, setGenerated] = useState<{ up?: GeneratedImage; down?: GeneratedImage }>({});
  const onGenerated = useCallback((kind: 'up' | 'down', blob: Blob) => {
    const url = URL.createObjectURL(blob);
    setGenerated((prev) => ({ ...prev, [kind]: { url, key: (prev[kind]?.key ?? 0) + 1 } }));
  }, []);

  return (
    <>
      <Tabs
        tabs={[
          { key: 'token', label: t('tokens.tabToken') },
          { key: 'sprites', label: t('tokens.tabSprites') },
          { key: 'model', label: t('tokens.tab3d') },
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
              source={generated.up}
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
              source={generated.down}
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
      <div hidden={tab !== 'model'}>
        <ModelField
          id={id('model')}
          state={model}
          name={current?.name ?? form.name}
          generate={canGenerate ? { upSize, downSize, onGenerated } : undefined}
        />
      </div>
    </>
  );
};

export default TokenFormFields;
