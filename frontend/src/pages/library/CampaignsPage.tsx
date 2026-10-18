import { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { toast } from 'sonner';
import { useCampaign } from '../../hooks/useCampaign';
import { campaignEditPath, campaignNewPath } from '../../lib/libraryRoutes';
import { statusLabelKey } from '../../lib/campaignStatus';
import type { CampaignInfo } from '../../types/campaign';
import type { PagedList } from '../../types/common';
import { LibraryPageHeader } from '../../components/library/LibraryPageHeader';
import { PagedListView } from '../../components/ui/PagedListView';
import { Tabs } from '../../components/ui/Tabs';
import { GearIcon, OpenIcon } from '../../components/ui/icons';

const TABS = ['mine', 'playing', 'search'] as const;
type CampaignTab = (typeof TABS)[number];
const PAGE_SIZE = 10;

/**
 * "Campanhas" of the library (087; was the campaign window): the campaigns the user masters (gear → the campaign's
 * page), the ones where one of their characters plays, and the search of the others. Choosing one opens it on the
 * table; "Nova campanha" creates one.
 */
export const CampaignsPage = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const tab: CampaignTab = (TABS as readonly string[]).includes(params.get('tab') ?? '') ? params.get('tab') as CampaignTab : 'mine';
  const { currentCampaign, listCampaigns, tableCampaigns, refreshTableCampaigns } = useCampaign();
  const [data, setData] = useState<PagedList<CampaignInfo> | null>(null);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');

  const load = useCallback(async (page: number, text = search) => {
    setLoading(true);
    try {
      setData(await listCampaigns({ page, pageSize: PAGE_SIZE, mine: tab === 'mine', search: tab === 'search' ? text : undefined }));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t('common.unknownError'));
    } finally {
      setLoading(false);
    }
  }, [listCampaigns, search, t, tab]);

  useEffect(() => {
    setData(null);
    if (tab === 'playing') void refreshTableCampaigns();
    else void load(1);
  // eslint-disable-next-line react-hooks/exhaustive-deps -- search reloads only on submit
  }, [tab]);

  const play = (slug: string, name: string) => {
    navigate(`/campaign/${encodeURIComponent(slug)}`);
    toast.success(t('toast.campaignSelected', { name }));
  };

  const renderCampaign = (campaign: CampaignInfo) => (
    <div className="d-flex justify-content-between align-items-center gap-2">
      <div className="min-w-0">
        <div className="fw-semibold text-truncate">{campaign.name}</div>
        <small className="text-body-secondary">{t('campaign.owner')}: {campaign.ownerName}</small>
      </div>
      <div className="d-flex gap-1 flex-shrink-0">
        {currentCampaign?.campaignId === campaign.campaignId && <span className="badge text-bg-primary">{t('campaign.current')}</span>}
        <span className="badge text-bg-secondary">{t(statusLabelKey(campaign.status))}</span>
        <span className={`badge ${campaign.open ? 'text-bg-success' : 'text-bg-secondary'}`}>
          {t(campaign.open ? 'campaign.openBadge' : 'campaign.closedBadge')}
        </span>
      </div>
    </div>
  );

  const playing = tableCampaigns.filter((campaign) => !campaign.isMaster);

  return (
    <section>
      <LibraryPageHeader title={t('library.nav.campaigns')}
        actions={<button type="button" className="btn btn-primary btn-sm" onClick={() => navigate(campaignNewPath())}>{t('campaign.newTab')}</button>} />
      <Tabs
        tabs={[
          { key: 'mine', label: t('campaign.mineTab') },
          { key: 'playing', label: t('library.campaigns.playingTab') },
          { key: 'search', label: t('campaign.searchTab') },
        ]}
        active={tab}
        onChange={(key) => setParams({ tab: key }, { replace: true })}
      />
      {tab === 'search' && (
        <form className="input-group mb-3" onSubmit={(e) => { e.preventDefault(); void load(1); }}>
          <input className="form-control" placeholder={t('campaign.searchPlaceholder')} value={search} onChange={(e) => setSearch(e.target.value)} />
          <button type="submit" className="btn btn-outline-primary">{t('common.search')}</button>
        </form>
      )}
      {tab === 'playing' ? (
        playing.length === 0 ? <p className="text-body-secondary">{t('library.campaigns.playingEmpty')}</p> : (
          <ul className="list-group stm-list">
            {playing.map((campaign) => (
              <li key={campaign.campaignId} className="list-group-item d-flex align-items-center gap-2">
                <div className="flex-grow-1 min-w-0">
                  <div className="fw-semibold text-truncate">{campaign.name}</div>
                  <small className="text-body-secondary">{t(statusLabelKey(campaign.status))}</small>
                </div>
                <button type="button" className="btn btn-sm btn-primary" onClick={() => play(campaign.slug, campaign.name)}
                  title={t('library.campaigns.play')} aria-label={t('library.campaigns.play')}>
                  <OpenIcon size={14} />
                </button>
              </li>
            ))}
          </ul>
        )
      ) : (
        <PagedListView
          data={data}
          loading={loading}
          renderItem={renderCampaign}
          getKey={(c) => c.campaignId}
          onSelect={(campaign) => play(campaign.slug, campaign.name)}
          renderActions={tab === 'mine' ? (campaign) => (
            <>
              <button type="button" className="btn btn-sm btn-primary" onClick={() => play(campaign.slug, campaign.name)}
                title={t('library.campaigns.play')} aria-label={t('library.campaigns.play')}>
                <OpenIcon size={14} />
              </button>
              <button type="button" className="btn btn-sm btn-outline-secondary" onClick={() => navigate(campaignEditPath(campaign.slug))}
                title={t('campaignSettings.open')} aria-label={t('campaignSettings.open')}>
                <GearIcon size={14} />
              </button>
            </>
          ) : undefined}
          onPageChange={(page) => { void load(page); }}
        />
      )}
    </section>
  );
};

export default CampaignsPage;
