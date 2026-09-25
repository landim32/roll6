import { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { Modal } from '../ui/Modal';
import { Tabs } from '../ui/Tabs';
import { PagedListView } from '../ui/PagedListView';
import { useCampaign } from '../../hooks/useCampaign';
import { useMapEditor } from '../../hooks/useMapEditor';
import { mapModelService } from '../../Services/mapModelService';
import { mapService } from '../../Services/mapService';
import type { PagedList } from '../../types/common';
import type { MapInfo } from '../../types/map';
import type { MapModelInfo } from '../../types/mapModel';

interface MapModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Resolves true when it is fine to replace the current map (unsaved-changes guard). */
  guard: () => Promise<boolean>;
}

const PAGE_SIZE = 10;

/** Current map picker: "Mapas da campanha", "Meus mapas" and "Buscar mapas". */
export const MapModal = ({ open, onOpenChange, guard }: MapModalProps) => {
  const { t } = useTranslation();
  const { currentCampaign } = useCampaign();
  const { loadMapModel, newMap } = useMapEditor();
  const [tab, setTab] = useState('campaign');
  const [campaignMaps, setCampaignMaps] = useState<PagedList<MapInfo> | null>(null);
  const [models, setModels] = useState<PagedList<MapModelInfo> | null>(null);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');

  const load = useCallback(async (page: number) => {
    setLoading(true);
    try {
      if (tab === 'campaign') {
        setCampaignMaps(currentCampaign ? await mapService.listByCampaign(currentCampaign.campaignId, page, PAGE_SIZE) : null);
      } else {
        setModels(await mapModelService.list({ page, pageSize: PAGE_SIZE, mine: tab === 'mine', search: tab === 'search' ? search : undefined }));
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t('common.unknownError'));
    } finally {
      setLoading(false);
    }
  }, [tab, currentCampaign, search, t]);

  useEffect(() => {
    if (open) load(1);
  // eslint-disable-next-line react-hooks/exhaustive-deps -- search reloads only on submit
  }, [open, tab, currentCampaign]);

  const open_ = async (mapModelId: number, map: MapInfo | null) => {
    if (!(await guard())) return;
    try {
      const draft = await loadMapModel(mapModelId, map);
      toast.success(t('toast.mapLoaded', { name: draft.name }));
      onOpenChange(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t('common.unknownError'));
    }
  };

  const onNewMap = async () => {
    if (!(await guard())) return;
    newMap();
    toast.info(t('toast.newMap'));
    onOpenChange(false);
  };

  const renderMap = (name: string, imageUrl: string | null, cols: number, rows: number, extra?: string) => (
    <div className="d-flex align-items-center gap-3">
      {imageUrl ? <img className="stm-thumb" src={imageUrl} alt="" /> : <div className="stm-thumb" />}
      <div>
        <div className="fw-semibold">{name}</div>
        <small className="text-body-secondary">
          {t('mapModal.grid', { cols, rows })}{extra ? ` · ${extra}` : ''}
        </small>
      </div>
    </div>
  );

  return (
    <Modal
      open={open}
      onOpenChange={onOpenChange}
      title={t('mapModal.title')}
      large
      footer={<button type="button" className="btn btn-outline-primary" onClick={onNewMap}>{t('mapModal.newMap')}</button>}
    >
      <Tabs
        tabs={[
          { key: 'campaign', label: t('mapModal.campaignTab') },
          { key: 'mine', label: t('mapModal.mineTab') },
          { key: 'search', label: t('mapModal.searchTab') },
        ]}
        active={tab}
        onChange={(key) => { setModels(null); setTab(key); }}
      />
      {tab === 'search' && (
        <form className="input-group mb-3" onSubmit={(e) => { e.preventDefault(); load(1); }}>
          <input className="form-control" placeholder={t('mapModal.searchPlaceholder')} value={search} onChange={(e) => setSearch(e.target.value)} />
          <button type="submit" className="btn btn-outline-primary">{t('common.search')}</button>
        </form>
      )}
      {tab === 'campaign' ? (
        currentCampaign ? (
          <PagedListView
            data={campaignMaps}
            loading={loading}
            renderItem={(m) => renderMap(m.name, m.mapModelImageUrl, m.gridWidth, m.gridHeight)}
            getKey={(m) => m.mapId}
            onSelect={(m) => open_(m.mapModelId, m)}
            onPageChange={load}
          />
        ) : (
          <p className="text-body-secondary">{t('mapModal.noCampaign')}</p>
        )
      ) : (
        <PagedListView
          data={models}
          loading={loading}
          renderItem={(m) => renderMap(m.name, m.imageUrl, m.gridWidth, m.gridHeight, m.description ?? undefined)}
          getKey={(m) => m.mapModelId}
          onSelect={(m) => open_(m.mapModelId, null)}
          onPageChange={load}
        />
      )}
    </Modal>
  );
};

export default MapModal;
