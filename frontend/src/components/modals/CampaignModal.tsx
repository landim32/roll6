import { useCallback, useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { Modal } from '../ui/Modal';
import { Tabs } from '../ui/Tabs';
import { PagedListView } from '../ui/PagedListView';
import { useCampaign } from '../../hooks/useCampaign';
import type { CampaignInfo } from '../../types/campaign';
import type { PagedList } from '../../types/common';

interface CampaignModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const PAGE_SIZE = 10;

/** Current campaign picker: "Minhas campanhas", "Buscar campanhas" (with owner) and "Nova campanha". */
export const CampaignModal = ({ open, onOpenChange }: CampaignModalProps) => {
  const { t } = useTranslation();
  const { currentCampaign, listCampaigns, createCampaign, selectCampaign, loading: saving } = useCampaign();
  const [tab, setTab] = useState('mine');
  const [data, setData] = useState<PagedList<CampaignInfo> | null>(null);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [name, setName] = useState('');
  const [isOpen, setIsOpen] = useState(false);

  const load = useCallback(async (page: number) => {
    setLoading(true);
    try {
      setData(await listCampaigns({ page, pageSize: PAGE_SIZE, mine: tab === 'mine', search: tab === 'search' ? search : undefined }));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t('common.unknownError'));
    } finally {
      setLoading(false);
    }
  }, [listCampaigns, tab, search, t]);

  useEffect(() => {
    if (open && tab !== 'new') load(1);
  // eslint-disable-next-line react-hooks/exhaustive-deps -- search reloads only on submit
  }, [open, tab]);

  const choose = (campaign: CampaignInfo) => {
    selectCampaign(campaign);
    toast.success(t('toast.campaignSelected', { name: campaign.name }));
    onOpenChange(false);
  };

  const onCreate = async (event: FormEvent) => {
    event.preventDefault();
    if (!name.trim()) {
      toast.error(t('login.required'));
      return;
    }
    try {
      const created = await createCampaign({ name: name.trim(), open: isOpen });
      toast.success(t('toast.campaignCreated', { name: created.name }));
      setName('');
      setIsOpen(false);
      onOpenChange(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t('common.unknownError'));
    }
  };

  const renderCampaign = (campaign: CampaignInfo) => (
    <div className="d-flex justify-content-between align-items-center gap-2">
      <div>
        <div className="fw-semibold">{campaign.name}</div>
        <small className="text-body-secondary">{t('campaign.owner')}: {campaign.ownerName}</small>
      </div>
      <div className="d-flex gap-1">
        {currentCampaign?.campaignId === campaign.campaignId && <span className="badge text-bg-primary">{t('campaign.current')}</span>}
        <span className={`badge ${campaign.open ? 'text-bg-success' : 'text-bg-secondary'}`}>
          {t(campaign.open ? 'campaign.openBadge' : 'campaign.closedBadge')}
        </span>
      </div>
    </div>
  );

  return (
    <Modal open={open} onOpenChange={onOpenChange} title={t('campaign.title')} large>
      <Tabs
        tabs={[
          { key: 'mine', label: t('campaign.mineTab') },
          { key: 'search', label: t('campaign.searchTab') },
          { key: 'new', label: t('campaign.newTab') },
        ]}
        active={tab}
        onChange={(key) => { setData(null); setTab(key); }}
      />
      {tab === 'search' && (
        <form className="input-group mb-3" onSubmit={(e) => { e.preventDefault(); load(1); }}>
          <input className="form-control" placeholder={t('campaign.searchPlaceholder')} value={search} onChange={(e) => setSearch(e.target.value)} />
          <button type="submit" className="btn btn-outline-primary">{t('common.search')}</button>
        </form>
      )}
      {tab === 'new' ? (
        <form onSubmit={onCreate}>
          <div className="mb-3">
            <label className="form-label" htmlFor="campaign-name">{t('campaign.name')}</label>
            <input id="campaign-name" className="form-control" value={name} onChange={(e) => setName(e.target.value)} maxLength={260} />
          </div>
          <div className="form-check mb-3">
            <input id="campaign-open" type="checkbox" className="form-check-input" checked={isOpen} onChange={(e) => setIsOpen(e.target.checked)} />
            <label className="form-check-label" htmlFor="campaign-open">{t('campaign.open')}</label>
          </div>
          <button type="submit" className="btn btn-primary" disabled={saving}>{t('campaign.create')}</button>
        </form>
      ) : (
        <PagedListView
          data={data}
          loading={loading}
          renderItem={renderCampaign}
          getKey={(c) => c.campaignId}
          onSelect={choose}
          onPageChange={load}
        />
      )}
    </Modal>
  );
};

export default CampaignModal;
