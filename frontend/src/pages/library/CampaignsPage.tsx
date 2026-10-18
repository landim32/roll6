import { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { useCampaign } from '../../hooks/useCampaign';
import { campaignEditPath, campaignNewPath } from '../../lib/libraryRoutes';
import type { CampaignSubsection } from '../../lib/libraryRoutes';
import { statusLabelKey } from '../../lib/campaignStatus';
import type { CampaignInfo } from '../../types/campaign';
import type { PagedList } from '../../types/common';
import { LibraryPageHeader } from '../../components/library/LibraryPageHeader';
import { CardGrid } from '../../components/library/CardGrid';
import { LibraryCard } from '../../components/library/LibraryCard';
import { useLegacyTab } from '../../components/library/useLegacyTab';
import { CampaignIcon, GearIcon, OpenIcon } from '../../components/ui/icons';

const PAGE_SIZE = 12;

interface CampaignsPageProps {
  /** The submenu on screen (090; were the tabs of 087): Minhas campanhas · Buscar · Jogando. */
  subsection: CampaignSubsection;
}

/**
 * "Campanhas" of the library (087; was the campaign window): the campaigns the user masters (gear → the campaign's
 * page), the search of the others and the ones where one of their characters plays — since 090 as cards in 3 columns
 * with the campaign's picture. Choosing one opens it on the table; "Nova campanha" creates one.
 */
export const CampaignsPage = ({ subsection }: CampaignsPageProps) => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  useLegacyTab('campaigns');
  const { currentCampaign, listCampaigns, tableCampaigns, refreshTableCampaigns } = useCampaign();
  const [data, setData] = useState<PagedList<CampaignInfo> | null>(null);
  const [search, setSearch] = useState('');

  const load = useCallback(async (page: number) => {
    try {
      setData(await listCampaigns({ page, pageSize: PAGE_SIZE, mine: subsection === 'mine', search: subsection === 'search' ? search : undefined }));
    } catch (err) {
      setData({ items: [], page: 1, pageSize: PAGE_SIZE, totalCount: 0 });
      toast.error(err instanceof Error ? err.message : t('common.unknownError'));
    }
  }, [listCampaigns, search, subsection, t]);

  useEffect(() => {
    if (subsection === 'playing') void refreshTableCampaigns();
    else void load(1);
  // eslint-disable-next-line react-hooks/exhaustive-deps -- search reloads only on submit
  }, [subsection]);

  const play = (slug: string, name: string) => {
    navigate(`/campaign/${encodeURIComponent(slug)}`);
    toast.success(t('toast.campaignSelected', { name }));
  };

  const playButton = (slug: string, name: string) => (
    <button type="button" className="btn btn-sm btn-primary" onClick={() => play(slug, name)}
      title={t('library.campaigns.play')} aria-label={t('library.campaigns.play')}>
      <OpenIcon size={14} />
    </button>
  );

  const figure = (url: string | null | undefined, name: string) => (url ? <img src={url} alt={name} loading="lazy" /> : undefined);

  const renderCampaign = (campaign: CampaignInfo) => (
    <LibraryCard
      ratio="wide"
      title={campaign.name}
      figure={figure(campaign.imageUrl, campaign.name)}
      fallback={<CampaignIcon />}
      onOpen={() => play(campaign.slug, campaign.name)}
      meta={`${t('campaign.owner')}: ${campaign.ownerName}`}
      badges={(
        <>
          {currentCampaign?.campaignId === campaign.campaignId && <span className="badge text-bg-primary">{t('campaign.current')}</span>}
          <span className="badge text-bg-secondary">{t(statusLabelKey(campaign.status))}</span>
          <span className={`badge ${campaign.open ? 'text-bg-success' : 'text-bg-secondary'}`}>
            {t(campaign.open ? 'campaign.openBadge' : 'campaign.closedBadge')}
          </span>
        </>
      )}
      actions={subsection === 'mine' ? (
        <>
          {playButton(campaign.slug, campaign.name)}
          <button type="button" className="btn btn-sm btn-outline-secondary" onClick={() => navigate(campaignEditPath(campaign.slug))}
            title={t('campaignSettings.open')} aria-label={t('campaignSettings.open')}>
            <GearIcon size={14} />
          </button>
        </>
      ) : undefined}
    />
  );

  const playing = tableCampaigns.filter((campaign) => !campaign.isMaster);
  const totalPages = data ? Math.max(1, Math.ceil(data.totalCount / data.pageSize)) : 1;

  return (
    <section>
      <LibraryPageHeader title={t(`library.sub.campaigns.${subsection}`)}
        actions={<button type="button" className="btn btn-primary btn-sm" onClick={() => navigate(campaignNewPath())}>{t('campaign.newTab')}</button>} />
      {subsection === 'search' && (
        <form className="input-group mb-3" onSubmit={(e) => { e.preventDefault(); void load(1); }}>
          <input className="form-control" placeholder={t('campaign.searchPlaceholder')} value={search} onChange={(e) => setSearch(e.target.value)} />
          <button type="submit" className="btn btn-outline-primary">{t('common.search')}</button>
        </form>
      )}
      {subsection === 'playing' ? (
        <CardGrid
          items={playing}
          cols={3}
          getKey={(campaign) => campaign.campaignId}
          emptyText={t('library.campaigns.playingEmpty')}
          renderCard={(campaign) => (
            <LibraryCard
              ratio="wide"
              title={campaign.name}
              figure={figure(campaign.imageUrl, campaign.name)}
              fallback={<CampaignIcon />}
              onOpen={() => play(campaign.slug, campaign.name)}
              meta={campaign.currentMapName ?? undefined}
              badges={<span className="badge text-bg-secondary">{t(statusLabelKey(campaign.status))}</span>}
              actions={playButton(campaign.slug, campaign.name)}
            />
          )}
        />
      ) : (
        <CardGrid
          items={data?.items ?? null}
          cols={3}
          getKey={(campaign) => campaign.campaignId}
          emptyText={t('common.empty')}
          renderCard={renderCampaign}
          page={data?.page ?? 1}
          totalPages={totalPages}
          onPage={(page) => { void load(page); }}
        />
      )}
    </section>
  );
};

export default CampaignsPage;
