import { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { ConfirmModal } from '../../components/ui/ConfirmModal';
import { MagicIcon, MapIcon, PencilIcon } from '../../components/ui/icons';
import { MakeCurrentMapButton } from '../../components/campaign/MakeCurrentMapButton';
import { LibraryPageHeader } from '../../components/library/LibraryPageHeader';
import { CardGrid } from '../../components/library/CardGrid';
import { LibraryCard } from '../../components/library/LibraryCard';
import { useLegacyTab } from '../../components/library/useLegacyTab';
import { useAuth } from '../../hooks/useAuth';
import { useCampaign } from '../../hooks/useCampaign';
import { useMapEditor } from '../../hooks/useMapEditor';
import { mapModelService } from '../../Services/mapModelService';
import { mapService } from '../../Services/mapService';
import { mapEditPath, mapGeneratorPath } from '../../lib/libraryRoutes';
import type { MapSubsection } from '../../lib/libraryRoutes';
import { visibleCampaignMaps } from '../../lib/viewerMap';
import { canMakeCurrent } from '../../lib/currentMap';
import type { PagedList } from '../../types/common';
import { MAP_STATUS_DELETED } from '../../types/map';
import type { MapInfo } from '../../types/map';
import type { MapModelInfo } from '../../types/mapModel';

const PAGE_SIZE = 12;

interface MapsPageProps {
  /** The submenu on screen (090; were the tabs of 087): Meus mapas · Buscar · Da campanha. */
  subsection: MapSubsection;
}

/**
 * "Mapas" of the library (087; was the maps window): the user's own library maps, the search and the current
 * campaign's maps (a player sees only the current one, 039) — since 090 one submenu each, as cards in 3 columns with
 * the map's picture. Choosing one opens it on the table; the pencil (own maps) goes to the map's edit page; "Novo
 * mapa" opens an empty map on the table. Replacing an unsaved map asks first.
 */
export const MapsPage = ({ subsection }: MapsPageProps) => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  useLegacyTab('maps');
  const tab = subsection;
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
    <>
      <button type="button" className="btn btn-sm btn-outline-secondary" title={t('mapModal.edit')} aria-label={t('mapModal.edit')}
        onClick={() => navigate(map ? `${mapEditPath(mapModelId)}?map=${map.mapId}` : mapEditPath(mapModelId))}>
        <PencilIcon size={14} />
      </button>
      {/* 095: the map's image as the starting point of the generator. */}
      <button type="button" className="btn btn-sm btn-outline-secondary" title={t('mapGenerator.editInGenerator')}
        aria-label={t('mapGenerator.editInGenerator')} onClick={() => navigate(mapGeneratorPath(mapModelId))}>
        <MagicIcon size={14} />
      </button>
    </>
  );

  const figure = (imageUrl: string | null, name: string) => (imageUrl ? <img src={imageUrl} alt={name} loading="lazy" /> : undefined);
  const gridText = (cols: number, rows: number) => t('mapModal.grid', { cols, rows });

  const campaignTotal = campaignMaps ? Math.max(1, Math.ceil(campaignMaps.totalCount / campaignMaps.pageSize)) : 1;
  const modelTotal = models ? Math.max(1, Math.ceil(models.totalCount / models.pageSize)) : 1;

  return (
    <section>
      <LibraryPageHeader title={t(`library.sub.maps.${subsection}`)}
        actions={<button type="button" className="btn btn-outline-primary btn-sm" onClick={onNewMap}>{t('mapModal.newMap')}</button>} />
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
          <CardGrid
            items={loading && !campaignMaps ? null : campaignMaps?.items ?? null}
            cols={3}
            getKey={(m) => m.mapId}
            emptyText={t('common.empty')}
            page={campaignMaps?.page ?? 1}
            totalPages={campaignTotal}
            onPage={(page) => { void load(page); }}
            renderCard={(m) => {
              const makeCurrent = canMakeCurrent(m, { isMaster, currentMapId: currentCampaign.currentMapId ?? null });
              const editable = m.userId === userId;
              return (
                <LibraryCard
                  ratio="wide"
                  title={m.name}
                  figure={figure(m.mapModelImageUrl, m.name)}
                  fallback={<MapIcon />}
                  onOpen={() => openCampaignMap(m)}
                  meta={gridText(m.gridWidth, m.gridHeight)}
                  badges={m.mapId === currentCampaign.currentMapId
                    ? <span className="badge text-bg-info">{t('campaignSettings.currentMap')}</span> : undefined}
                  actions={makeCurrent || editable ? (
                    <>
                      {makeCurrent && <MakeCurrentMapButton map={m} />}
                      {editable && editButton(m.mapModelId, m)}
                    </>
                  ) : undefined}
                />
              );
            }}
          />
        ) : (
          <p className="text-body-secondary">{t('mapModal.noCampaign')}</p>
        )
      ) : (
        <CardGrid
          items={loading && !models ? null : models?.items ?? null}
          cols={3}
          getKey={(m) => m.mapModelId}
          emptyText={t('common.empty')}
          page={models?.page ?? 1}
          totalPages={modelTotal}
          onPage={(page) => { void load(page); }}
          renderCard={(m) => (
            <LibraryCard
              ratio="wide"
              title={m.name}
              figure={figure(m.imageUrl, m.name)}
              fallback={<MapIcon />}
              onOpen={() => openModel(m.mapModelId)}
              meta={m.description ? `${gridText(m.gridWidth, m.gridHeight)} · ${m.description}` : gridText(m.gridWidth, m.gridHeight)}
              actions={m.userId === userId ? editButton(m.mapModelId, null) : undefined}
            />
          )}
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
