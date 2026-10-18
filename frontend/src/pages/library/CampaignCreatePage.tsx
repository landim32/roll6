import { useState } from 'react';
import type { FormEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { useCampaign } from '../../hooks/useCampaign';
import { useLeaveGuard } from '../../hooks/useLeaveGuard';
import { campaignEditPath, libraryPath } from '../../lib/libraryRoutes';
import { LibraryPageHeader } from '../../components/library/LibraryPageHeader';
import { CampaignImageField } from '../../components/campaign/CampaignImageField';
import { uploadCampaignImage } from '../../lib/campaignImage';
import type { ImageCrop } from '../../components/ui/ImageCropper';

/** "Nova campanha" (087; was a tab of the campaign window): creates it — with its picture, 090 — and goes to its page. */
export const CampaignCreatePage = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { createCampaign, loading: saving } = useCampaign();
  const [name, setName] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const [crop, setCrop] = useState<ImageCrop | null>(null);
  const [uploading, setUploading] = useState(false);
  const [done, setDone] = useState(false);
  const guard = useLeaveGuard(!done && (name.trim().length > 0 || isOpen || crop !== null));

  const onCreate = async (event: FormEvent) => {
    event.preventDefault();
    if (!name.trim()) {
      toast.error(t('login.required'));
      return;
    }
    try {
      setUploading(true);
      const image = crop ? await uploadCampaignImage(crop) : null;
      const created = await createCampaign({ name: name.trim(), open: isOpen, image });
      toast.success(t('toast.campaignCreated', { name: created.name }));
      setDone(true);
      navigate(campaignEditPath(created.slug), { replace: true });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t('common.unknownError'));
    } finally {
      setUploading(false);
    }
  };

  return (
    <section className="stm-library-form">
      <LibraryPageHeader title={t('campaign.newTab')} back={{ to: libraryPath('campaigns'), label: t('library.nav.campaigns') }} />
      <form onSubmit={onCreate}>
        <div className="mb-3">
          <label className="form-label" htmlFor="campaign-name">{t('campaign.name')}</label>
          <input id="campaign-name" className="form-control" value={name} onChange={(e) => setName(e.target.value)} maxLength={260} autoFocus />
        </div>
        <div className="form-check mb-3">
          <input id="campaign-open" type="checkbox" className="form-check-input" checked={isOpen} onChange={(e) => setIsOpen(e.target.checked)} />
          <label className="form-check-label" htmlFor="campaign-open">{t('campaign.open')}</label>
        </div>
        <CampaignImageField id="campaign-image" currentUrl={null} onChange={setCrop} disabled={saving || uploading} />
        <button type="submit" className="btn btn-primary" disabled={saving || uploading}>{t('campaign.create')}</button>
      </form>
      {guard}
    </section>
  );
};

export default CampaignCreatePage;
