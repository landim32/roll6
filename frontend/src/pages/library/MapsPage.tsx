import { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { toast } from 'sonner';
import { Tabs } from '../../components/ui/Tabs';
import { PagedListView } from '../../components/ui/PagedListView';
import { ConfirmModal } from '../../components/ui/ConfirmModal';
import { PencilIcon } from '../../components/ui/icons';
import { MakeCurrentMapButton } from '../../components/campaign/MakeCurrentMapButton';
import { LibraryPageHeader } from '../../components/library/LibraryPageHeader';
import { useAuth } from '../../hooks/useAuth';
import { useCampaign } from '../../hooks/useCampaign';
import { useMapEditor } from '../../hooks/useMapEditor';
import { mapModelService } from '../../Services/mapModelService';
import { mapService } from '../../Services/mapService';
import { mapEditPath } from '../../lib/libraryRoutes';
import { visibleCampaignMaps } from '../../lib/viewerMap';
import { canMakeCurrent } from '../../lib/currentMap';
import type { PagedList } from '../../types/common';
import { MAP_STATUS_DELETED } from '../../types/map';
import type { MapInfo } from '../../types/map';
import type { MapModelInfo } from '../../types/mapModel';

const TABS = ['campaign', 'mine', 'search'] as const;
type MapTab = (typeof TABS)[number];
const PAGE_SIZE = 10;

/**
 * "Mapas" of the library (087; was the maps window): the current campaign's maps (a player sees only the current one,
 * 039), the user's own library maps and the search. Choosing one opens it on the table; the pencil (own maps) goes to
 * the map's edit page; "Novo mapa" opens an empty map on the table. Replacing an unsaved map asks first.
 */
export const MapsPage = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const tab: MapTab = (TABS as readonly string[]).includes(params.get('tab') ?? '') ? params.get('tab') as MapTab : 'campaign';
  const { session } = useAuth();
  const userId = session?.user.userId ?? null;
  const { currentCampaign, isMaster } = useCampaign();
  const { loadMapModel, newMap, isDirty, canEdit } = useMapEditor();
  const [campaignMaps, setCampaignMaps] = useState<PagedList<MapInfo> | null>(null);
  const [models, setModels] = useState<PagedList<MapModelInfo> | null>(null);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [pending, setPending] = useState<(() => Promise<void>) | null>(null);

  const loadCampaignMaps = useCallback(async (campaignId: number, currentMapId: number | null, page: number): Promise<PagedList<MapInfo>> => {
    if (isMaster) return mapService.listByCampaign(campaignId, page, PAGE_SIZE);
    const current = currentMapId !== null ? [await mapService.getById(currentMapId)] : [];
    const items = visibleCampaignMaps(current.filter((m) => m.status !== MAP_STATUS_DELETED), { isMaster, currentMapId });
    return { items, page: 1, pageSize: PAGE_SIZE, totalCount: items.length };
  }, [isMaster]);

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
  }, [tab, currentCampaign, loadCampaignMaps, search, t]);

  useEffect(() => {
    void load(1);
  // eslint-disable-next-line react-hooks/exhaustive-deps -- search reloads only on submit
  }, [tab, currentCampaign]);

  /** Runs an action that replaces the table's map: asks first when its draft has unsaved changes. */
  const replacing = (action: () => Promise<void>) => {
    if (isDirty && canEdit) setPending(() => action);
    else void action();
  };

  const openCampaignMap = (map: MapInfo) => {
    navigate(`/map/${encodeURIComponent(map.slug)}`);
    toast.success(t('toast.mapLoaded', { name: map.name }));
  };

  const openModel = (mapModelId: number) => replacing(async () => {
    try {
      const draft = await loadMapModel(mapModelId, null);
      toast.success(t('toast.mapLoaded', { name: draft.name }));
      navigate('/');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t('common.unknownError'));
    }
  });

  const onNewMap = () => replacing(async () => {
    newMap();
    toast.info(t('toast.newMap'));
    navigate('/');
  });

  const editButton = (mapModelId: number, map: MapInfo | null) => (
    <button type="button" className="btn btn-sm btn-outline-secondary" title={t('mapModal.edit')} aria-label={t('mapModal.edit')}
      onClick={() => navigate(map ? `${mapEditPath(mapModelId)}?map=${map.mapId}` : mapEditPath(mapModelId))}>
      <PencilIcon size={14} />
    </button>
  );

  const renderMap = (name: string, imageUrl: string | null, cols: number, rows: number, extra?: string, current = false) => (
    <div className="d-flex align-items-center gap-3">
      {imageUrl ? <img className="stm-thumb" src={imageUrl} alt="" /> : <div className="stm-thumb" />}
      <div>
        <div className="fw-semibold d-flex align-items-center gap-2">
          {name}
          {current && <span className="badge text-bg-info">{t('campaignSettings.currentMap')}</span>}
        </div>
        <small className="text-body-secondary">
          {t('mapModal.grid', { cols, rows })}{extra ? ` · ${extra}` : ''}
        </small>
      </div>
    </div>
  );

  return (
    <section>
      <LibraryPageHeader title={t('library.nav.maps')}
        actions={<button type="button" className="btn btn-outline-primary btn-sm" onClick={onNewMap}>{t('mapModal.newMap')}</button>} />
      <Tabs
        tabs={[
          { key: 'campaign', label: t('mapModal.campaignTab') },
          { key: 'mine', label: t('mapModal.mineTab') },
          { key: 'search', label: t('mapModal.searchTab') },
        ]}
        active={tab}
        onChange={(key) => { setModels(null); setParams({ tab: key }, { replace: true }); }}
      />
      {tab === 'search' && (
        <form className="input-group mb-3" onSubmit={(e) => { e.preventDefault(); void load(1); }}>
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
            renderItem={(m) => renderMap(m.name, m.mapModelImageUrl, m.gridWidth, m.gridHeight, undefined, m.mapId === currentCampaign.currentMapId)}
            getKey={(m) => m.mapId}
            onSelect={openCampaignMap}
            renderActions={(m) => {
              const makeCurrent = canMakeCurrent(m, { isMaster, currentMapId: currentCampaign.currentMapId ?? null });
              const editable = m.userId === userId;
              if (!makeCurrent && !editable) return null;
              return (
                <>
                  {makeCurrent && <MakeCurrentMapButton map={m} />}
                  {editable && editButton(m.mapModelId, m)}
                </>
              );
            }}
            onPageChange={(page) => { void load(page); }}
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
          onSelect={(m) => openModel(m.mapModelId)}
          renderActions={(m) => (m.userId === userId ? editButton(m.mapModelId, null) : null)}
          onPageChange={(page) => { void load(page); }}
        />
      )}
      <ConfirmModal
        open={pending !== null}
        onOpenChange={(open) => { if (!open) setPending(null); }}
        title={t('library.maps.discardTitle')}
        message={t('library.maps.discardMessage')}
        confirmLabel={t('library.leave.discard')}
        onConfirm={async () => { const action = pending; setPending(null); await action?.(); }}
        danger
      />
    </section>
  );
};

export default MapsPage;
