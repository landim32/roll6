import { mapRegionCenter } from '../lib/mapRegion';
import { createContext, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { mapModelService } from '../Services/mapModelService';
import { mapService } from '../Services/mapService';
import { campaignService } from '../Services/campaignService';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { useTableEvents } from '../hooks/useRealtime';
import { TABLE_EVENT } from '../types/realtime';
import { MAP_STORAGE_KEY } from '../Services/apiHelpers';
import { parseTablePath } from '../lib/tableRoute';
import { useAuth } from '../hooks/useAuth';
import { useCampaign } from '../hooks/useCampaign';
import { gridPixelSize, HEX_SIZE } from '../lib/hexGrid';
import {
  createEmptyDraft, draftFromMapModel, isSameDraft, MAX_GRID_SIZE, MIN_GRID_SIZE, toMapModelInsert,
} from '../lib/draft';
import type { MapDraft } from '../lib/draft';
import { sameRatio } from '../lib/maskImage';
import { clampFov, FOV_DEFAULT } from '../lib/storyCamera';
import { readViewMode, writeViewMode } from '../lib/viewMode';
import type { ViewMode } from '../lib/viewMode';
import { MAP_STATUS_DELETED } from '../types/map';
import type { MapInfo } from '../types/map';
import type { CampaignInfo } from '../types/campaign';
import { isMasterOf, viewerMapDecision } from '../lib/viewerMap';

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
  /** Puts the map point (map units) in the middle of the screen with this zoom. */
  centerOn: (mapX: number, mapY: number, zoom: number) => void;
  // Draft editing (saved only by saveMap)
  setImage: (fileName: string, url: string | null) => Promise<void>;
  setImageLayout: (layout: ImageLayout) => void;
  setGridSize: (columns: number, rows: number) => void;
  toggleResizeMode: () => void;
  // 3D view (034)
  /** 3D mask of the draft (black = wall); null removes it. */
  setMaskImage: (fileName: string | null, url: string | null) => void;
  /** Background (360° panorama) of the 3D view; null removes it. */
  setBackgroundImage: (fileName: string | null, url: string | null) => void;
  /** Wall texture of the 3D view (036); null removes it and the walls take the map's colors again. */
  setWallTextureImage: (fileName: string | null, url: string | null) => void;
  /** 2D map or 3D view of the open map (any map has the 3D view). */
  viewMode: ViewMode;
  setViewMode: (mode: ViewMode) => void;
  /** Field of view (degrees) of the 3D view: its zoom. Not saved. */
  fov: number;
  setFov: (fov: number) => void;
  // Map lifecycle
  newMap: () => void;
  /** `keepView` keeps zoom/pan (the same map reloaded because someone saved it, 017). */
  loadMapModel: (mapModelId: number, map?: MapInfo | null, options?: { keepView?: boolean }) => Promise<MapDraft>;
  /**
   * Opens a campaign map by its URL slug — or, for a player, the campaign's current map instead (039): the choice is
   * made before loading, so a map the master hasn't revealed never shows. Returns what was opened and its campaign.
   */
  openCampaignMapBySlug: (slug: string) => Promise<OpenBySlugResult>;
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

/** Map remembered across reloads. */
interface StoredMap {
  mapModelId: number;
  mapId: number | null;
}

const readStoredMap = (): StoredMap | null => {
  try {
    const parsed = JSON.parse(localStorage.getItem(MAP_STORAGE_KEY) ?? 'null') as Partial<StoredMap> | null;
    return parsed && typeof parsed.mapModelId === 'number'
      ? { mapModelId: parsed.mapModelId, mapId: typeof parsed.mapId === 'number' ? parsed.mapId : null }
      : null;
  } catch {
    return null;
  }
};

const writeStoredMap = (map: StoredMap | null) => {
  try {
    if (map) localStorage.setItem(MAP_STORAGE_KEY, JSON.stringify(map));
    else localStorage.removeItem(MAP_STORAGE_KEY);
  } catch {
    // Storage unavailable: the map just isn't reopened after a reload.
  }
};

/** What `openCampaignMapBySlug` did (039): the asked map, the current one instead, or nothing (no current map). */
export interface OpenBySlugResult {
  map: MapInfo | null;
  campaign: CampaignInfo;
  outcome: 'opened' | 'redirected' | 'noCurrentMap';
}

export const MapEditorProvider = ({ children }: { children: ReactNode }) => {
  const { session } = useAuth();
  const { currentCampaign, isMaster, refreshTableCampaigns } = useCampaign();
  const [draft, setDraft] = useState<MapDraft>(createEmptyDraft);
  const { t } = useTranslation();
  /** Mask URL of the draft, read by `setImage` without making it depend on the draft. */
  const maskUrlRef = useRef<string | null>(null);
  maskUrlRef.current = draft.maskImageUrl;
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
  const centerOn = useCallback((mapX: number, mapY: number, zoom: number) => {
    const scale = clamp(zoom, MIN_ZOOM, MAX_ZOOM);
    const [cx, cy] = mapRegionCenter();
    setView({ zoom: scale, panX: cx - mapX * scale, panY: cy - mapY * scale });
  }, []);

  // ---------- draft editing ----------

  const setImage = useCallback(async (fileName: string, url: string | null) => {
    const size = url ? await loadImageSize(url) : null;
    // A 3D mask covers the map image, so it must keep its proportion: warn when a new image breaks it (034).
    if (size && maskUrlRef.current) {
      const mask = await loadImageSize(maskUrlRef.current);
      if (mask && !sameRatio(mask, size)) toast.warning(t('raycast.maskMismatch'));
    }
    setDraft((prev) => ({
      ...prev,
      image: fileName,
      imageUrl: url,
      imageWidth: size?.width ?? null,
      imageHeight: size?.height ?? null,
      imageLeft: 0,
      imageTop: 0,
    }));
  }, [t]);

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

  // ---------- 3D view (034) ----------

  const [viewMode, setViewModeState] = useState<ViewMode>('2d');
  const [fov, setFovState] = useState(FOV_DEFAULT);
  const setFov = useCallback((value: number) => setFovState(clampFov(value)), []);

  const setMaskImage = useCallback((fileName: string | null, url: string | null) => {
    setDraft((prev) => ({ ...prev, maskImage: fileName, maskImageUrl: url }));
  }, []);

  const setBackgroundImage = useCallback((fileName: string | null, url: string | null) => {
    setDraft((prev) => ({ ...prev, backgroundImage: fileName, backgroundImageUrl: url }));
  }, []);

  const setWallTextureImage = useCallback((fileName: string | null, url: string | null) => {
    setDraft((prev) => ({ ...prev, wallTextureImage: fileName, wallTextureImageUrl: url }));
  }, []);

  const setViewMode = useCallback((mode: ViewMode) => {
    setViewModeState(mode);
    if (draft.mapModelId !== null) writeViewMode(draft.mapModelId, mode);
    if (mode === '3d') setResizeMode(false);
  }, [draft.mapModelId]);

  // Each map reopens in the view last used for it on this device.
  useEffect(() => {
    setViewModeState(draft.mapModelId !== null ? readViewMode(draft.mapModelId) : '2d');
  }, [draft.mapModelId]);

  // ---------- map lifecycle ----------

  const resetTo = useCallback((next: MapDraft, keepView = false) => {
    setDraft(next);
    setSaved(next);
    setResizeMode(false);
    if (!keepView) setView(INITIAL_VIEW);
  }, []);

  const newMap = useCallback(() => resetTo(createEmptyDraft()), [resetTo]);

  const loadMapModel = useCallback(async (mapModelId: number, map?: MapInfo | null, options?: { keepView?: boolean }): Promise<MapDraft> => {
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
      resetTo(next, options?.keepView ?? false);
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
        const next = {
          ...draftFromMapModel(updated),
          mapId: draft.mapId,
          mapSlug: draft.mapSlug,
          campaignId: draft.campaignId,
          name: draft.name,
        };
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
      if (campaignMap) await refreshTableCampaigns();
      return { name: created.name, copied: isCopy, campaignName: campaignMap ? currentCampaign?.name ?? null : null };
    } catch (err) {
      return handleError(err);
    } finally {
      setLoading(false);
    }
  }, [draft, needsName, isCopy, currentCampaign, isMaster, refreshTableCampaigns]);

  const clearError = useCallback(() => setError(null), []);

  // ---------- remember the open map across reloads ----------

  /** False while the remembered map is being reopened, so the empty start draft doesn't erase it. */
  const restoredRef = useRef(false);
  /** Same as `restoredRef`, as state: following the master waits for the restore (017). */
  const [restored, setRestored] = useState(false);
  const markRestored = (value: boolean) => {
    restoredRef.current = value;
    setRestored(value);
  };

  /** The campaign of a map (the open one when it is the same) and what this user may see of it (039). */
  const campaignOfMap = useCallback(async (map: MapInfo): Promise<CampaignInfo> =>
    (currentCampaign?.campaignId === map.campaignId ? currentCampaign : campaignService.getById(map.campaignId)),
  [currentCampaign]);

  const viewerDecisionFor = async (map: MapInfo, campaign?: CampaignInfo) => {
    const owner = campaign ?? await campaignOfMap(map);
    return viewerMapDecision({
      isMaster: isMasterOf(owner, session?.user.userId),
      mapId: map.mapId,
      mapCampaignId: map.campaignId,
      campaignId: owner.campaignId,
      currentMapId: owner.currentMapId,
    });
  };

  // Once logged in, reopen the remembered map (a campaign map through its map, else the model alone).
  useEffect(() => {
    markRestored(false);
    if (!session) return;
    // A /campaign or /map address is resolved by useTableRoute; restoring here would race it.
    if (parseTablePath(window.location.pathname).kind !== 'root') {
      markRestored(true);
      return;
    }
    const stored = readStoredMap();
    if (!stored) {
      markRestored(true);
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        let map = stored.mapId !== null ? await mapService.getById(stored.mapId) : null;
        if (cancelled) return;
        if (map && map.status === MAP_STATUS_DELETED) throw new Error('map deleted');
        if (map) {
          // A player reopens only the campaign's current map, silently (039 FR-003).
          const decision = await viewerDecisionFor(map);
          if (cancelled) return;
          if (decision.kind === 'none') {
            writeStoredMap(null);
            return;
          }
          if (decision.kind === 'redirect') map = await mapService.getById(decision.mapId!);
          if (cancelled) return;
        }
        await loadMapModel(map?.mapModelId ?? stored.mapModelId, map);
      } catch {
        // Deleted, no longer accessible or offline: start with an empty map.
        if (!cancelled) writeStoredMap(null);
      } finally {
        if (!cancelled) markRestored(true);
      }
    })();
    return () => { cancelled = true; };
  // eslint-disable-next-line react-hooks/exhaustive-deps -- once per session
  }, [session?.user.userId]);

  // Remember whatever map is open (opened, saved as new or copied); a new empty map forgets it.
  useEffect(() => {
    if (!restoredRef.current) return;
    writeStoredMap(draft.mapModelId !== null ? { mapModelId: draft.mapModelId, mapId: draft.mapId } : null);
  }, [draft.mapModelId, draft.mapId]);

  // ---------- real-time table (017) ----------

  const { selectCampaign } = useCampaign();
  const campaignId = currentCampaign?.campaignId ?? null;
  const currentMapId = currentCampaign?.currentMapId ?? null;

  // The master opening a map of his current campaign makes it the map the players follow.
  useEffect(() => {
    if (!restored || !isMaster || campaignId === null || draft.mapId === null) return;
    if (draft.campaignId !== campaignId || draft.mapId === currentMapId) return;
    campaignService.setCurrentMap(campaignId, draft.mapId)
      .then((campaign) => selectCampaign(campaign))
      .catch(() => { /* players just don't follow this time */ });
  }, [restored, isMaster, campaignId, currentMapId, draft.mapId, draft.campaignId, selectCampaign]);

  /** Opens a campaign map by id (following the master or reloading the same map). */
  const openCampaignMap = useCallback(async (mapId: number, options?: { keepView?: boolean }) => {
    const map = await mapService.getById(mapId);
    if (map.status === MAP_STATUS_DELETED) return null;
    return loadMapModel(map.mapModelId, map, options);
  }, [loadMapModel]);

  const openCampaignMapBySlug = useCallback(async (slug: string): Promise<OpenBySlugResult> => {
    const map = await mapService.getBySlug(slug);
    if (map.status === MAP_STATUS_DELETED) throw new Error('map deleted');
    const campaign = await campaignOfMap(map);
    const decision = await viewerDecisionFor(map, campaign);
    if (decision.kind === 'none') {
      // No current map: a player sees none, so whatever map of this campaign was open goes away (039 FR-004).
      if (draft.campaignId === campaign.campaignId) newMap();
      return { map: null, campaign, outcome: 'noCurrentMap' };
    }
    const opened = decision.kind === 'redirect' ? await mapService.getById(decision.mapId!) : map;
    await loadMapModel(opened.mapModelId, opened);
    return { map: opened, campaign, outcome: decision.kind === 'redirect' ? 'redirected' : 'opened' };
  // eslint-disable-next-line react-hooks/exhaustive-deps -- viewerDecisionFor only reads campaignOfMap and the session
  }, [loadMapModel, campaignOfMap, draft.campaignId, newMap, session?.user.userId]);

  /**
   * Players see only the campaign's current map (039): on entering the campaign (after the restore, so it wins over
   * the remembered map), whenever the master switches, and whenever another map of the campaign ends up open. With no
   * current map the open map of the campaign is closed. Unsaved changes are never discarded (players can't edit
   * campaign maps, so for them this never blocks).
   */
  const followedRef = useRef<string | null>(null);
  useEffect(() => {
    if (!restored) return;
    // Two triggers: the campaign or its current map changed (follow), or another map of this campaign is open.
    // A library model (no mapId) or a map of another campaign is left alone.
    const key = `${campaignId}:${currentMapId}`;
    const switched = followedRef.current !== key;
    followedRef.current = key;
    const otherMapOfCampaign = draft.mapId !== null && draft.campaignId === campaignId && draft.mapId !== currentMapId;
    if (!switched && !otherMapOfCampaign) return;
    if (isMaster || campaignId === null || draft.mapId === currentMapId) return;
    if (currentMapId === null) {
      if (draft.mapId !== null && draft.campaignId === campaignId && !isDirty) newMap();
      return;
    }
    if (isDirty) {
      toast.warning(t('realtime.mapChangedDirty'));
      return;
    }
    const hadMap = draft.mapId !== null;
    openCampaignMap(currentMapId)
      .then((opened) => {
        if (opened && hadMap) toast.info(t('realtime.followedMap', { name: opened.name }));
      })
      .catch(() => { /* not accessible (yet): stay on the current map */ });
  }, [restored, campaignId, currentMapId, isMaster, isDirty, draft.mapId, draft.campaignId, openCampaignMap, newMap, t]);

  useTableEvents((event) => {
    if (event.type === TABLE_EVENT.mapSaved) {
      const savedModelId = (event.data as { mapModelId?: number } | null)?.mapModelId;
      if (savedModelId === undefined || savedModelId !== draft.mapModelId) return;
      if (isDirty) {
        toast.warning(t('realtime.mapChangedDirty'));
        return;
      }
      const reload = draft.mapId !== null
        ? openCampaignMap(draft.mapId, { keepView: true })
        : loadMapModel(savedModelId, null, { keepView: true });
      reload.catch(() => { /* keep what is on screen */ });
    } else if (event.type === TABLE_EVENT.mapDeleted && event.mapId !== null && event.mapId === draft.mapId) {
      newMap();
      toast.warning(t('realtime.mapDeleted'));
    }
  });

  const value: MapEditorContextType = {
    draft, saved, isDirty, canEdit, needsName, isCopy, hexSize, gridSize, view, resizeMode, loading, error,
    zoomAt, zoomIn, zoomOut, panBy, centerOn,
    setImage, setImageLayout, setGridSize, toggleResizeMode,
    setMaskImage, setBackgroundImage, setWallTextureImage, viewMode, setViewMode, fov, setFov,
    newMap, loadMapModel, openCampaignMapBySlug, discardChanges, saveMap, clearError,
  };

  return <MapEditorContext.Provider value={value}>{children}</MapEditorContext.Provider>;
};

export default MapEditorContext;
