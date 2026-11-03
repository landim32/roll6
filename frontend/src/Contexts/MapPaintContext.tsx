import { createContext, useCallback, useEffect, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { mapPaintService } from '../Services/mapPaintService';
import { useCampaign } from '../hooks/useCampaign';
import { useMapEditor } from '../hooks/useMapEditor';
import { useTableEvents } from '../hooks/useRealtime';
import { canEditMap } from '../lib/campaignStatus';
import { applyPaintChange, emptyPaint, markBatches } from '../lib/mapPaint';
import { TABLE_EVENT } from '../types/realtime';
import { DEFAULT_PAINT_SETTINGS } from '../types/mapPaint';
import type {
  HexContentInfo, MapDrawingInfo, MapDrawingInsertInfo, MapHexMarkWriteInfo, MapPaintChangeInfo, MapPaintInfo,
  PaintSettings,
} from '../types/mapPaint';

interface MapPaintContextType {
  /** Paint of the campaign map open in the editor; null for a model opened outside a campaign (or not loaded). */
  paint: MapPaintInfo | null;
  /** Only the master of the map's campaign paints, while the campaign is active (or being prepared). */
  canPaint: boolean;
  loading: boolean;
  error: string | null;
  /** The toolbar's choices (memory only). */
  settings: PaintSettings;
  updateSettings: (changes: Partial<PaintSettings>) => void;
  refresh: () => Promise<void>;
  /** Upserts/removes hex marks (split in requests of ≤ 200); applies the server's result. */
  setHexMarks: (writes: MapHexMarkWriteInfo[]) => Promise<void>;
  addDrawing: (drawing: MapDrawingInsertInfo) => Promise<MapDrawingInfo>;
  deleteDrawing: (mapDrawingId: number) => Promise<void>;
  /** Removes every mark and drawing of the open map. */
  clearPaint: () => Promise<void>;
  /** Mark and pieces of a hex of the open map. */
  getHexContent: (x: number, y: number) => Promise<HexContentInfo>;
  clearError: () => void;
}

const MapPaintContext = createContext<MapPaintContextType | undefined>(undefined);

export const MapPaintProvider = ({ children }: { children: ReactNode }) => {
  const { draft } = useMapEditor();
  const { currentCampaign, isMaster } = useCampaign();
  const [paint, setPaint] = useState<MapPaintInfo | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [settings, setSettings] = useState<PaintSettings>(DEFAULT_PAINT_SETTINGS);
  /** Map whose paint is wanted; late responses for another map are dropped. */
  const mapIdRef = useRef<number | null>(null);

  const mapId = draft.mapId;
  const canPaint = mapId !== null && isMaster && draft.campaignId === currentCampaign?.campaignId
    && canEditMap(currentCampaign?.status, true);

  const handleError = (err: unknown): never => {
    setError(err instanceof Error ? err.message : 'Unknown error');
    throw err;
  };

  const refresh = useCallback(async () => {
    mapIdRef.current = mapId;
    if (mapId === null) {
      setPaint(null);
      return;
    }
    try {
      setLoading(true);
      const loaded = await mapPaintService.getPaint(mapId);
      if (mapIdRef.current === mapId) setPaint(loaded);
    } catch (err) {
      // Not allowed (not a participant) or offline: nothing painted; 401 is handled globally.
      if (mapIdRef.current === mapId) setPaint(emptyPaint(mapId));
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  }, [mapId]);

  useEffect(() => {
    setPaint(null);
    void refresh();
  }, [refresh]);

  /** Applies a change of the open map (own write result or someone's event). */
  const apply = useCallback((targetMapId: number, change: MapPaintChangeInfo) => {
    if (mapIdRef.current !== targetMapId) return;
    setPaint((prev) => applyPaintChange(prev ?? emptyPaint(targetMapId), change));
  }, []);

  useTableEvents((event) => {
    if (event.type === TABLE_EVENT.resync) {
      void refresh();
      return;
    }
    if (event.type !== TABLE_EVENT.mapPaintChanged || event.mapId === null) return;
    const change = event.data as MapPaintChangeInfo | null;
    if (change) apply(event.mapId, change);
  });

  const requireMap = useCallback((): number => {
    if (mapId === null) throw new Error('no campaign map open');
    return mapId;
  }, [mapId]);

  const setHexMarks = useCallback(async (writes: MapHexMarkWriteInfo[]) => {
    if (writes.length === 0) return;
    try {
      setError(null);
      const target = requireMap();
      for (const batch of markBatches(writes)) {
        const change = await mapPaintService.setHexMarks(target, { marks: batch });
        apply(target, change);
      }
    } catch (err) {
      handleError(err);
    }
  }, [requireMap, apply]);

  const addDrawing = useCallback(async (drawing: MapDrawingInsertInfo): Promise<MapDrawingInfo> => {
    try {
      setError(null);
      const target = requireMap();
      const created = await mapPaintService.addDrawing(target, drawing);
      apply(target, { drawing: created });
      return created;
    } catch (err) {
      return handleError(err);
    }
  }, [requireMap, apply]);

  const deleteDrawing = useCallback(async (mapDrawingId: number) => {
    try {
      setError(null);
      const target = requireMap();
      await mapPaintService.deleteDrawing(target, mapDrawingId);
      apply(target, { deletedDrawingId: mapDrawingId });
    } catch (err) {
      handleError(err);
    }
  }, [requireMap, apply]);

  const clearPaint = useCallback(async () => {
    try {
      setError(null);
      const target = requireMap();
      await mapPaintService.clearPaint(target);
      apply(target, { cleared: true });
    } catch (err) {
      handleError(err);
    }
  }, [requireMap, apply]);

  const getHexContent = useCallback(async (x: number, y: number): Promise<HexContentInfo> => {
    try {
      setError(null);
      return await mapPaintService.getHexContent(requireMap(), x, y);
    } catch (err) {
      return handleError(err);
    }
  }, [requireMap]);

  const updateSettings = useCallback((changes: Partial<PaintSettings>) => {
    setSettings((prev) => ({ ...prev, ...changes }));
  }, []);

  const clearError = useCallback(() => setError(null), []);

  const value: MapPaintContextType = {
    paint, canPaint, loading, error, settings, updateSettings, refresh,
    setHexMarks, addDrawing, deleteDrawing, clearPaint, getHexContent, clearError,
  };
  return <MapPaintContext.Provider value={value}>{children}</MapPaintContext.Provider>;
};

export default MapPaintContext;
