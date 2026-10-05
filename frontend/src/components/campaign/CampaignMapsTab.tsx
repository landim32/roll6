import { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { ConfirmModal } from '../ui/ConfirmModal';
import { ArchiveIcon, OpenIcon, PencilIcon, TrashIcon, UnarchiveIcon } from '../ui/icons';
import { MapEditModal } from '../modals/MapEditModal';
import { mapService } from '../../Services/mapService';
import { useCampaign } from '../../hooks/useCampaign';
import { useTableEvents } from '../../hooks/useRealtime';
import { MAP_STATUS_ACTIVE, MAP_STATUS_ARCHIVED } from '../../types/map';
import type { MapInfo } from '../../types/map';
import type { PagedList } from '../../types/common';
import { TABLE_EVENT } from '../../types/realtime';

const PAGE_SIZE = 10;

interface CampaignMapsTabProps {
  /** Opens the map on the table (the caller checks unsaved changes and closes the settings). */
  onOpenMap: (map: MapInfo) => void;
}

const errorMessage = (err: unknown) => (err instanceof Error ? err.message : String(err));

/** "Mapas" tab (018): the campaign maps with open / archive / reactivate / delete; the table's map is marked. */
export const CampaignMapsTab = ({ onOpenMap }: CampaignMapsTabProps) => {
  const { t } = useTranslation();
  const { currentCampaign } = useCampaign();
  const campaignId = currentCampaign?.campaignId ?? null;
  const [page, setPage] = useState(1);
  const [data, setData] = useState<PagedList<MapInfo> | null>(null);
  const [busyId, setBusyId] = useState<number | null>(null);
  const [toDelete, setToDelete] = useState<MapInfo | null>(null);
  const [editing, setEditing] = useState<MapInfo | null>(null);

  const load = useCallback(async () => {
    if (campaignId === null) return;
    try {
      setData(await mapService.listByCampaign(campaignId, page, PAGE_SIZE));
    } catch (err) {
      toast.error(errorMessage(err));
    }
  }, [campaignId, page]);

  useEffect(() => { void load(); }, [load]);

  // Maps added/changed/deleted elsewhere (another tab of the master, 017).
  useTableEvents((event) => {
    if (event.type === TABLE_EVENT.mapsChanged || event.type === TABLE_EVENT.mapDeleted) void load();
  });

  const setStatus = async (map: MapInfo, status: number) => {
    try {
      setBusyId(map.mapId);
      await mapService.update(map.mapId, { name: map.name, status });
      toast.success(t(status === MAP_STATUS_ARCHIVED ? 'toast.mapArchived' : 'toast.mapRestored', { name: map.name }));
      await load();
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setBusyId(null);
    }
  };

  const remove = async () => {
    if (!toDelete) return;
    try {
      await mapService.remove(toDelete.mapId);
      toast.success(t('toast.mapDeleted', { name: toDelete.name }));
      setToDelete(null);
      await load();
    } catch (err) {
      toast.error(errorMessage(err));
      throw err;
    }
  };

  if (!data) return <p className="text-body-secondary">{t('common.loading')}</p>;
  if (data.items.length === 0) return <p className="text-body-secondary">{t('campaignSettings.noMaps')}</p>;
  const totalPages = Math.max(1, Math.ceil(data.totalCount / data.pageSize));

  return (
    <>
      <ul className="list-group stm-list stm-grid-list">
        {data.items.map((map) => {
          const archived = map.status === MAP_STATUS_ARCHIVED;
          const busy = busyId === map.mapId;
          const statusLabel = archived ? 'campaignSettings.restoreMap' : 'campaignSettings.archiveMap';
          return (
            <li key={map.mapId} className="list-group-item stm-character-row">
              {map.mapModelImageUrl ? <img className="stm-thumb" src={map.mapModelImageUrl} alt="" /> : <div className="stm-thumb" />}
              <div className="stm-character-text">
                <strong className="d-flex align-items-center gap-2">
                  <span className="text-truncate" title={map.name}>{map.name}</span>
                  {map.mapId === currentCampaign?.currentMapId && <span className="badge text-bg-info">{t('campaignSettings.currentMap')}</span>}
                </strong>
                <small className="text-body-secondary">
                  {t('campaignSettings.mapGrid', { cols: map.gridWidth, rows: map.gridHeight })}
                  {' · '}
                  {t(archived ? 'campaignSettings.mapArchived' : 'campaignSettings.mapActive')}
                </small>
              </div>
              <div className="stm-character-actions">
                <button type="button" className="btn btn-sm btn-primary" disabled={busy} onClick={() => onOpenMap(map)}
                  title={t('campaignSettings.openMap')} aria-label={t('campaignSettings.openMap')}>
                  <OpenIcon size={14} />
                </button>
                <button type="button" className="btn btn-sm btn-outline-secondary" disabled={busy} onClick={() => setEditing(map)}
                  title={t('campaignSettings.editMap')} aria-label={t('campaignSettings.editMap')}>
                  <PencilIcon size={14} />
                </button>
                <button type="button" className="btn btn-sm btn-outline-secondary" disabled={busy}
                  title={t(statusLabel)} aria-label={t(statusLabel)}
                  onClick={() => { void setStatus(map, archived ? MAP_STATUS_ACTIVE : MAP_STATUS_ARCHIVED); }}>
                  {archived ? <UnarchiveIcon size={14} /> : <ArchiveIcon size={14} />}
                </button>
                <button type="button" className="btn btn-sm btn-outline-danger" disabled={busy} onClick={() => setToDelete(map)}
                  title={t('campaignSettings.deleteMap')} aria-label={t('campaignSettings.deleteMap')}>
                  <TrashIcon size={14} />
                </button>
              </div>
            </li>
          );
        })}
      </ul>
      {totalPages > 1 && (
        <div className="d-flex justify-content-between align-items-center mt-2">
          <button type="button" className="btn btn-sm btn-outline-secondary" disabled={page <= 1} onClick={() => setPage(page - 1)}>{t('common.previous')}</button>
          <small className="text-body-secondary">{page} / {totalPages}</small>
          <button type="button" className="btn btn-sm btn-outline-secondary" disabled={page >= totalPages} onClick={() => setPage(page + 1)}>{t('common.next')}</button>
        </div>
      )}
      <MapEditModal
        target={editing ? { mapModelId: editing.mapModelId, map: editing } : null}
        onClose={() => setEditing(null)}
        onSaved={() => { void load(); }}
      />
      <ConfirmModal
        open={toDelete !== null}
        onOpenChange={(o) => { if (!o) setToDelete(null); }}
        title={t('campaignSettings.deleteMap')}
        message={toDelete ? t('campaignSettings.deleteMapMessage', { name: toDelete.name }) : ''}
        confirmLabel={t('campaignSettings.deleteMap')}
        onConfirm={remove}
        danger
      />
    </>
  );
};

export default CampaignMapsTab;
