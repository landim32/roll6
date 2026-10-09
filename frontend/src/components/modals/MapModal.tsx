import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { Modal } from '../ui/Modal';
import { Tabs } from '../ui/Tabs';
import { PagedListView } from '../ui/PagedListView';
import { PencilIcon } from '../ui/icons';
import { MapEditModal } from './MapEditModal';
import type { MapEditTarget } from './MapEditModal';
import { useAuth } from '../../hooks/useAuth';
import { useCampaign } from '../../hooks/useCampaign';
import { useMapEditor } from '../../hooks/useMapEditor';
import { mapModelService } from '../../Services/mapModelService';
import { mapService } from '../../Services/mapService';
import type { PagedList } from '../../types/common';
import { MAP_STATUS_DELETED } from '../../types/map';
import type { MapInfo } from '../../types/map';
import { visibleCampaignMaps } from '../../lib/viewerMap';
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
  const navigate = useNavigate();
  const { session } = useAuth();
  const userId = session?.user.userId ?? null;
  const { currentCampaign, isMaster } = useCampaign();
  const { loadMapModel, newMap } = useMapEditor();
  const [tab, setTab] = useState('campaign');
  const [campaignMaps, setCampaignMaps] = useState<PagedList<MapInfo> | null>(null);
  const [models, setModels] = useState<PagedList<MapModelInfo> | null>(null);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  /** Map whose "Editar" button was clicked (name, grid, image, 3D mask and background). */
  const [editing, setEditing] = useState<MapEditTarget | null>(null);

  /**
   * The master pages through every campaign map; a player gets only the current one (039 FR-006), read directly
   * because it may not be on the first page of the full list.
   */
  const loadCampaignMaps = async (campaignId: number, currentMapId: number | null, page: number): Promise<PagedList<MapInfo>> => {
    if (isMaster) return mapService.listByCampaign(campaignId, page, PAGE_SIZE);
    const current = currentMapId !== null ? [await mapService.getById(currentMapId)] : [];
    const items = visibleCampaignMaps(current.filter((m) => m.status !== MAP_STATUS_DELETED), { isMaster, currentMapId });
    return { items, page: 1, pageSize: PAGE_SIZE, totalCount: items.length };
  };

  const load = useCallback(async (page: number) => {
    setLoading(true);
    try {
      if (tab === 'campaign') {
        setCampaignMaps(currentCampaign ? await loadCampaignMaps(currentCampaign.campaignId, currentCampaign.currentMapId, page) : null);
      } else {
        setModels(await mapModelService.list({ page, pageSize: PAGE_SIZE, mine: tab === 'mine', search: tab === 'search' ? search : undefined }));
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t('common.unknownError'));
    } finally {
      setLoading(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps -- loadCampaignMaps only reads isMaster
  }, [tab, currentCampaign, isMaster, search, t]);

  useEffect(() => {
    if (open) load(1);
  // eslint-disable-next-line react-hooks/exhaustive-deps -- search reloads only on submit
  }, [open, tab, currentCampaign]);

  const open_ = async (mapModelId: number, map: MapInfo | null) => {
    if (map) {
      navigate(`/map/${encodeURIComponent(map.slug)}`);
      toast.success(t('toast.mapLoaded', { name: map.name }));
      onOpenChange(false);
      return;
    }
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

  const editButton = (target: MapEditTarget) => (
    <button type="button" className="btn btn-sm btn-outline-secondary" title={t('mapModal.edit')} aria-label={t('mapModal.edit')}
      onClick={() => setEditing(target)}>
      <PencilIcon size={14} />
    </button>
  );

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
        currentCampaign && !isMaster && campaignMaps && campaignMaps.items.length === 0 ? (
          <p className="text-body-secondary">{t('map.noCurrentMap')}</p>
        ) : currentCampaign ? (
          <PagedListView
            data={campaignMaps}
            loading={loading}
            renderItem={(m) => renderMap(m.name, m.mapModelImageUrl, m.gridWidth, m.gridHeight)}
            getKey={(m) => m.mapId}
            onSelect={(m) => open_(m.mapModelId, m)}
            renderActions={(m) => (m.userId === userId ? editButton({ mapModelId: m.mapModelId, map: m }) : null)}
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
          renderActions={(m) => (m.userId === userId ? editButton({ mapModelId: m.mapModelId, map: null }) : null)}
          onPageChange={load}
        />
      )}
      <MapEditModal
        target={editing}
        onClose={() => setEditing(null)}
        onSaved={() => { void load((tab === 'campaign' ? campaignMaps?.page : models?.page) ?? 1); }}
      />
    </Modal>
  );
};

export default MapModal;
