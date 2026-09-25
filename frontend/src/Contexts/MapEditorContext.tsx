import { createContext, useCallback, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import { mapModelService } from '../Services/mapModelService';
import { mapService } from '../Services/mapService';
import { useAuth } from '../hooks/useAuth';
import { useCampaign } from '../hooks/useCampaign';
import { gridPixelSize, HEX_SIZE } from '../lib/hexGrid';
import {
  createEmptyDraft, draftFromMapModel, isSameDraft, MAX_GRID_SIZE, MIN_GRID_SIZE, toMapModelInsert,
} from '../lib/draft';
import type { MapDraft } from '../lib/draft';
import type { MapInfo } from '../types/map';

/** Zoom limits and step (research R3). */
export const MIN_ZOOM = 0.1;
export const MAX_ZOOM = 4;
const ZOOM_STEP = 1.25;
/** Initial offset so the grid does not start under the top menu. */
const INITIAL_VIEW = { zoom: 1, panX: 40, panY: 80 };

/** Screen transform of the map (not saved). */
export interface MapView {
  zoom: number;
  panX: number;
  panY: number;
}

/** Image offsets accepted by the backend (−20000..20000). */
const MAX_IMAGE_OFFSET = 20000;

/** Image position/size in map units (the image is drawn at (−left, −top)). */
export interface ImageLayout {
  left: number;
  top: number;
  width: number;
  height: number;
}

/** Name asked when saving a new map or a copy. */
export interface SaveMapInfo {
  name: string;
  description: string | null;
}

/** What happened on save, for the caller's toast. */
export interface SaveMapResult {
  name: string;
  copied: boolean;
  /** Campaign the new map was added to, if any. */
  campaignName: string | null;
}

interface MapEditorContextType {
  // State
  draft: MapDraft;
  saved: MapDraft;
  isDirty: boolean;
  /** False when the map belongs to a campaign of another master. */
  canEdit: boolean;
  /** Saving must ask for a name: new map, or a library map owned by someone else (copy). */
  needsName: boolean;
  isCopy: boolean;
  hexSize: number;
  /** Grid size in map units (px at zoom 1). */
  gridSize: { width: number; height: number };
  view: MapView;
  resizeMode: boolean;
  loading: boolean;
  error: string | null;
  // View
  zoomAt: (factor: number, screenX: number, screenY: number) => void;
  zoomIn: (screenX: number, screenY: number) => void;
  zoomOut: (screenX: number, screenY: number) => void;
  panBy: (dx: number, dy: number) => void;
  // Draft editing (saved only by saveMap)
  setImage: (fileName: string, url: string | null) => Promise<void>;
  setImageLayout: (layout: ImageLayout) => void;
  setGridSize: (columns: number, rows: number) => void;
  toggleResizeMode: () => void;
  // Map lifecycle
  newMap: () => void;
  loadMapModel: (mapModelId: number, map?: MapInfo | null) => Promise<MapDraft>;
  discardChanges: () => void;
  saveMap: (info?: SaveMapInfo) => Promise<SaveMapResult>;
  clearError: () => void;
}

const MapEditorContext = createContext<MapEditorContextType | undefined>(undefined);

/** Natural size of an image URL (null when it cannot be loaded). */
const loadImageSize = (url: string): Promise<{ width: number; height: number } | null> =>
  new Promise((resolve) => {
    const image = new Image();
    image.onload = () => resolve({ width: image.naturalWidth, height: image.naturalHeight });
    image.onerror = () => resolve(null);
    image.src = url;
  });

const clamp = (value: number, min: number, max: number): number => Math.min(Math.max(value, min), max);

export const MapEditorProvider = ({ children }: { children: ReactNode }) => {
  const { session } = useAuth();
  const { currentCampaign, isMaster } = useCampaign();
  const [draft, setDraft] = useState<MapDraft>(createEmptyDraft);
  const [saved, setSaved] = useState<MapDraft>(createEmptyDraft);
  const [view, setView] = useState<MapView>(INITIAL_VIEW);
  const [resizeMode, setResizeMode] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleError = (err: unknown): never => {
    setError(err instanceof Error ? err.message : 'Unknown error');
    throw err;
  };

  const userId = session?.user.userId ?? null;
  const isDirty = !isSameDraft(draft, saved);
  const canEdit = draft.mapId === null || (isMaster && currentCampaign?.campaignId === draft.campaignId);
  const isCopy = draft.mapModelId !== null && draft.ownerUserId !== userId;
  const needsName = draft.mapModelId === null || isCopy;

  // Fixed: adjusting the image never changes the grid.
  const hexSize = HEX_SIZE;

  const gridSize = useMemo(() => gridPixelSize(draft.gridWidth, draft.gridHeight, hexSize), [draft.gridWidth, draft.gridHeight, hexSize]);

  // ---------- view ----------

  const zoomAt = useCallback((factor: number, screenX: number, screenY: number) => {
    setView((prev) => {
      const zoom = clamp(prev.zoom * factor, MIN_ZOOM, MAX_ZOOM);
      const applied = zoom / prev.zoom;
      // Keep the point under (screenX, screenY) fixed while zooming.
      return { zoom, panX: screenX - (screenX - prev.panX) * applied, panY: screenY - (screenY - prev.panY) * applied };
    });
  }, []);

  const zoomIn = useCallback((x: number, y: number) => zoomAt(ZOOM_STEP, x, y), [zoomAt]);
  const zoomOut = useCallback((x: number, y: number) => zoomAt(1 / ZOOM_STEP, x, y), [zoomAt]);
  const panBy = useCallback((dx: number, dy: number) => {
    setView((prev) => ({ ...prev, panX: prev.panX + dx, panY: prev.panY + dy }));
  }, []);

  // ---------- draft editing ----------

  const setImage = useCallback(async (fileName: string, url: string | null) => {
    const size = url ? await loadImageSize(url) : null;
    setDraft((prev) => ({
      ...prev,
      image: fileName,
      imageUrl: url,
      imageWidth: size?.width ?? null,
      imageHeight: size?.height ?? null,
      imageLeft: 0,
      imageTop: 0,
    }));
  }, []);

  /** Moves/resizes the image under the fixed grid (backend: size ≥ 1, offset within ±20000). */
  const setImageLayout = useCallback((layout: ImageLayout) => {
    setDraft((prev) => ({
      ...prev,
      imageWidth: Math.max(1, Math.round(layout.width)),
      imageHeight: Math.max(1, Math.round(layout.height)),
      imageLeft: clamp(Math.round(layout.left), -MAX_IMAGE_OFFSET, MAX_IMAGE_OFFSET),
      imageTop: clamp(Math.round(layout.top), -MAX_IMAGE_OFFSET, MAX_IMAGE_OFFSET),
    }));
  }, []);

  const setGridSize = useCallback((columns: number, rows: number) => {
    if (columns < MIN_GRID_SIZE || columns > MAX_GRID_SIZE || rows < MIN_GRID_SIZE || rows > MAX_GRID_SIZE)
      throw new RangeError('grid size out of range');
    setDraft((prev) => ({ ...prev, gridWidth: columns, gridHeight: rows }));
  }, []);

  const toggleResizeMode = useCallback(() => setResizeMode((prev) => !prev), []);

  // ---------- map lifecycle ----------

  const resetTo = useCallback((next: MapDraft) => {
    setDraft(next);
    setSaved(next);
    setResizeMode(false);
    setView(INITIAL_VIEW);
  }, []);

  const newMap = useCallback(() => resetTo(createEmptyDraft()), [resetTo]);

  const loadMapModel = useCallback(async (mapModelId: number, map?: MapInfo | null): Promise<MapDraft> => {
    try {
      setLoading(true);
      setError(null);
      const model = await mapModelService.getById(mapModelId);
      let next = draftFromMapModel(model, map);
      // Legacy maps without display size: use the natural size without making the map dirty.
      if (next.imageUrl && (!next.imageWidth || !next.imageHeight)) {
        const size = await loadImageSize(next.imageUrl);
        if (size) next = { ...next, imageWidth: size.width, imageHeight: size.height };
      }
      resetTo(next);
      return next;
    } catch (err) {
      return handleError(err);
    } finally {
      setLoading(false);
    }
  }, [resetTo]);

  const discardChanges = useCallback(() => {
    setDraft(saved);
    setResizeMode(false);
  }, [saved]);

  /**
   * Own existing map → PUT. New map or someone else's (copy) → POST with the given name, and
   * when the user is the master of the current campaign the new map is added to it (FR-020).
   */
  const saveMap = useCallback(async (info?: SaveMapInfo): Promise<SaveMapResult> => {
    try {
      setLoading(true);
      setError(null);
      if (!needsName && draft.mapModelId !== null) {
        const updated = await mapModelService.update(
          draft.mapModelId, toMapModelInsert(draft, draft.modelName, draft.description));
        const next = { ...draftFromMapModel(updated), mapId: draft.mapId, campaignId: draft.campaignId, name: draft.name };
        setDraft(next);
        setSaved(next);
        return { name: next.name, copied: false, campaignName: null };
      }

      if (!info?.name.trim()) throw new Error('name required');
      const created = await mapModelService.create(toMapModelInsert(draft, info.name.trim(), info.description));
      let campaignMap: MapInfo | null = null;
      if (currentCampaign && isMaster)
        campaignMap = await mapService.create({ campaignId: currentCampaign.campaignId, mapModelId: created.mapModelId });
      const next = draftFromMapModel(created, campaignMap);
      setDraft(next);
      setSaved(next);
      return { name: created.name, copied: isCopy, campaignName: campaignMap ? currentCampaign?.name ?? null : null };
    } catch (err) {
      return handleError(err);
    } finally {
      setLoading(false);
    }
  }, [draft, needsName, isCopy, currentCampaign, isMaster]);

  const clearError = useCallback(() => setError(null), []);

  const value: MapEditorContextType = {
    draft, saved, isDirty, canEdit, needsName, isCopy, hexSize, gridSize, view, resizeMode, loading, error,
    zoomAt, zoomIn, zoomOut, panBy,
    setImage, setImageLayout, setGridSize, toggleResizeMode,
    newMap, loadMapModel, discardChanges, saveMap, clearError,
  };

  return <MapEditorContext.Provider value={value}>{children}</MapEditorContext.Provider>;
};

export default MapEditorContext;
