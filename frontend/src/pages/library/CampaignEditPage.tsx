import { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Navigate, useNavigate, useParams } from 'react-router-dom';
import { toast } from 'sonner';
import { useAuth } from '../../hooks/useAuth';
import { useCampaign } from '../../hooks/useCampaign';
import { useLeaveGuard } from '../../hooks/useLeaveGuard';
import { CAMPAIGN_SECTIONS, campaignEditPath, isCampaignSection, libraryPath } from '../../lib/libraryRoutes';
import { ApiError } from '../../Services/apiHelpers';
import type { MapInfo } from '../../types/map';
import { LibraryPageHeader } from '../../components/library/LibraryPageHeader';
import { NotFoundCard } from '../../components/library/NotFoundCard';
import { CampaignMapsTab } from '../../components/campaign/CampaignMapsTab';
import { CampaignNpcsTab } from '../../components/campaign/CampaignNpcsTab';
import { CampaignPlanTab } from '../../components/campaign/CampaignPlanTab';
import { CampaignStatusSelect } from '../../components/campaign/CampaignStatusSelect';
import { ManageCharactersPanel } from '../../components/campaign/ManageCharactersPanel';
import { CampaignImageField } from '../../components/campaign/CampaignImageField';
import { uploadCampaignImage } from '../../lib/campaignImage';
import type { ImageCrop } from '../../components/ui/ImageCropper';

const SECTION_LABEL = {
  characters: 'campaignSettings.tabCharacters',
  npcs: 'campaignSettings.tabNpcs',
  maps: 'campaignSettings.tabMaps',
  plan: 'campaignSettings.tabPlan',
} as const;

/**
 * The campaign in full screen (087; was the settings window of 018), master only: its status, its picture (090) and the sections
 * Personagens, NPCs, Mapas and Plano, each with its address. The panels read the current campaign, so the campaign of
 * the address becomes the current one. Leaving with an unsaved plan asks first.
 */
export const CampaignEditPage = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { slug = '', section } = useParams();
  const { session } = useAuth();
  const { currentCampaign, getCampaignBySlug, selectCampaign, setCampaignImage } = useCampaign();
  const [state, setState] = useState<'loading' | 'ready' | 'notFound' | 'notMaster'>('loading');
  const [planDirty, setPlanDirty] = useState(false);
  const [imageCrop, setImageCrop] = useState<ImageCrop | null>(null);
  const [imageKey, setImageKey] = useState(0);
  const [savingImage, setSavingImage] = useState(false);
  const guard = useLeaveGuard(planDirty || imageCrop !== null);
  const onDirtyChange = useCallback((dirty: boolean) => setPlanDirty(dirty), []);

  useEffect(() => {
    let cancelled = false;
    if (currentCampaign?.slug === slug) {
      setState(currentCampaign.userId === session?.user.userId ? 'ready' : 'notMaster');
      return;
    }
    setState('loading');
    getCampaignBySlug(slug)
      .then((found) => {
        if (cancelled) return;
        if (found.userId !== session?.user.userId) {
          setState('notMaster');
          return;
        }
        selectCampaign(found);
      })
      .catch((err: unknown) => {
        if (!cancelled) setState(err instanceof ApiError && err.status === 403 ? 'notMaster' : 'notFound');
      });
    return () => { cancelled = true; };
  // eslint-disable-next-line react-hooks/exhaustive-deps -- reload only when the address or the current campaign changes
  }, [slug, currentCampaign?.slug, session?.user.userId]);

  if (!isCampaignSection(section)) return <Navigate to={campaignEditPath(slug)} replace />;
  if (state === 'notFound') return <NotFoundCard message={t('library.notFound')} backTo={libraryPath('campaigns')} />;
  if (state === 'notMaster') return <NotFoundCard message={t('library.campaigns.masterOnly')} backTo={libraryPath('campaigns')} />;
  if (state === 'loading' || !currentCampaign) return <p className="text-body-secondary">{t('common.loading')}</p>;

  /** Saves the picture at once (like the status): a new crop is uploaded first; null removes it. */
  const saveImage = async (crop: ImageCrop | null) => {
    setSavingImage(true);
    try {
      await setCampaignImage(crop ? await uploadCampaignImage(crop) : null);
      toast.success(t(crop ? 'campaign.image.saved' : 'campaign.image.removed'));
      setImageCrop(null);
      setImageKey((value) => value + 1);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t('common.unknownError'));
    } finally {
      setSavingImage(false);
    }
  };

  const openMap = (map: MapInfo) => {
    navigate(`/map/${encodeURIComponent(map.slug)}`);
    toast.success(t('toast.mapLoaded', { name: map.name }));
  };

  return (
    <section>
      <LibraryPageHeader title={currentCampaign.name} back={{ to: libraryPath('campaigns'), label: t('library.nav.campaigns') }} />
      <CampaignStatusSelect />
      <div className="stm-library-form mb-3">
        <CampaignImageField key={imageKey} id="campaign-edit-image" currentUrl={currentCampaign.imageUrl ?? null}
          onChange={setImageCrop} disabled={savingImage}
          onRemoveCurrent={currentCampaign.imageUrl ? () => { void saveImage(null); } : undefined} />
        {imageCrop && (
          <button type="button" className="btn btn-primary btn-sm" disabled={savingImage} onClick={() => { void saveImage(imageCrop); }}>
            {t('campaign.image.save')}
          </button>
        )}
      </div>
      <ul className="nav nav-tabs mb-3" role="tablist">
        {CAMPAIGN_SECTIONS.map((key) => (
          <li className="nav-item" key={key} role="presentation">
            <button type="button" role="tab" aria-selected={section === key}
              className={`nav-link${section === key ? ' active' : ''}`}
              onClick={() => { if (key !== section) navigate(campaignEditPath(slug, key)); }}>
              {t(SECTION_LABEL[key])}
            </button>
          </li>
        ))}
      </ul>
      <div className="stm-library-section">
        {section === 'characters' && <ManageCharactersPanel active />}
        {section === 'npcs' && <CampaignNpcsTab />}
        {section === 'maps' && <CampaignMapsTab onOpenMap={openMap} />}
        {section === 'plan' && <CampaignPlanTab onDirtyChange={onDirtyChange} />}
      </div>
      {guard}
    </section>
  );
};

export default CampaignEditPage;
