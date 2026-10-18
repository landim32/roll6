import { useTranslation } from 'react-i18next';
import { ImageCropper } from '../ui/ImageCropper';
import type { ImageCrop } from '../ui/ImageCropper';
import { CAMPAIGN_IMAGE_ASPECT } from '../../lib/campaignImage';

interface CampaignImageFieldProps {
  id: string;
  /** The saved picture (edit), or null. */
  currentUrl: string | null;
  onChange: (crop: ImageCrop | null) => void;
  /** Removes the saved picture; without it there is no "Remover". */
  onRemoveCurrent?: () => void;
  disabled?: boolean;
}

/**
 * "Imagem da campanha" (090): the wide picture of the campaign's library card, picked and cropped at 16:9. The
 * caller uploads the crop with `lib/campaignImage.uploadCampaignImage` when it saves.
 */
export const CampaignImageField = ({ id, currentUrl, onChange, onRemoveCurrent, disabled }: CampaignImageFieldProps) => {
  const { t } = useTranslation();
  return (
    <fieldset className="mb-3" disabled={disabled}>
      <label className="form-label" htmlFor={id}>{t('campaign.image.label')}</label>
      <ImageCropper
        id={id}
        shape="square"
        aspect={CAMPAIGN_IMAGE_ASPECT}
        rotatable
        hint={t('campaign.image.hint')}
        hasCurrent={currentUrl !== null}
        currentUrl={currentUrl}
        currentName={t('campaign.image.label')}
        onRemoveCurrent={onRemoveCurrent}
        onChange={onChange}
      />
    </fieldset>
  );
};

export default CampaignImageField;
