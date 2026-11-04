import { mapRegionCenter } from '../lib/mapRegion';
import { createContext, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { useLocation } from 'react-router-dom';
import { mapModelService } from '../Services/mapModelService';
import { mapService } from '../Services/mapService';
import { campaignService } from '../Services/campaignService';
import { campaignCharacterService } from '../Services/campaignCharacterService';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { useTableEvents } from '../hooks/useRealtime';
import { TABLE_EVENT } from '../types/realtime';
import type { CharacterMapEvent } from '../types/realtime';
import { MAP_STORAGE_KEY } from '../Services/apiHelpers';
import { parseTablePath } from '../lib/tableRoute';
import { useAuth } from '../hooks/useAuth';
import { useCampaign } from '../hooks/useCampaign';
import { useCharacter } from '../hooks/useCharacter';
import { gridPixelSize, HEX_SIZE } from '../lib/hexGrid';
import {
  createEmptyDraft, draftFromMapModel, isSameDraft, MAX_GRID_SIZE, MIN_GRID_SIZE, toMapModelInsert,
} from '../lib/draft';
import type { MapDraft } from '../lib/draft';
import { sameRatio } from '../lib/maskImage';
import { clampFov, FOV_DEFAULT } from '../lib/storyCamera';
import { isThreeD, readViewMode, writeViewMode } from '../lib/viewMode';
import type { ViewMode } from '../lib/viewMode';
import { readViewQuality, writeViewQuality } from '../lib/viewQuality';
import type { ViewQuality } from '../lib/viewQuality';
import { MAP_STATUS_DELETED } from '../types/map';
import type { MapInfo } from '../types/map';
import type { CampaignInfo } from '../types/campaign';
import { isMasterOf, masterDefaultMap, ownParticipationOf, storedOwnMap, viewerMapDecision } from '../lib/viewerMap';
import { readStoredSelections } from '../lib/characterSelection';
import { canEditMap } from '../lib/campaignStatus';

/** Zoom limits and step (research R3). */
export const MIN_ZOOM = 0.1;
export const MAX_ZOOM = 4;
const ZOOM_STEP = 1.25;
/** Initial offset so the grid does not start under the top menu. */
const INITIAL_VIEW = { zoom: 1, panX: 40, panY: 80 };
/** "O mestre está mudando o mapa" (108): stays at least this long to be readable, and never longer than the limit. */
const MAP_CHANGE_MIN_MS = 1500;
const MAP_CHANGE_MAX_MS = 15_000;

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
  /**
   * "Editar mapa" (107): only while on do the image tools and "Pintar" show. Memory only; turned off when the open
   * map can no longer be edited (another master's map, a paused/finished campaign).
   */
  editMode: boolean;
  setEditMode: (on: boolean) => void;
  /** "Pintar" (107): clicks and drags paint the campaign map. Only in 2D, on a campaign map, inside the edit mode. */
  paintMode: boolean;
  setPaintMode: (on: boolean) => void;
  loading: boolean;
  error: string | null;
  /** The master is taking the player's chosen character to another map (108): the screen says so until it is ready. */
  mapChanging: boolean;
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
  /** Quality level of the 3D view (053): per user and device, remembered in `roll6:3d-quality`, applied at once. */
  viewQuality: ViewQuality;
  setViewQuality: (level: ViewQuality) => void;
  /**
   * The player walks his character in the 3D view (055, free mode): while true the zoom buttons move the camera closer
   * or farther (`storyZoom`) instead of changing the field of view. The 3D view registers the handler.
   */
  storyWalking: boolean;
  storyZoom: (steps: number) => void;
  registerStoryZoom: (handler: ((steps: number) => void) | null) => void;
  // Map lifecycle
  newMap: () => void;
  /** `keepView` keeps zoom/pan (the same map reloaded because someone saved it, 017). */
  loadMapModel: (mapModelId: number, map?: MapInfo | null, options?: { keepView?: boolean }) => Promise<MapDraft>;
  /**
   * Opens a campaign map by its URL slug — or, for a player, the map of his chosen character instead (108): the choice is
   * made before loading, so another map never shows. Returns what was opened and its campaign.
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

/** What `openCampaignMapBySlug` did: the asked map, the character's instead, or nothing (the character is on no map). */
export interface OpenBySlugResult {
  map: MapInfo | null;
  campaign: CampaignInfo;
  outcome: 'opened' | 'redirected' | 'noMap';
}

/** The message on screen (108): which event it answers (A→B→C keeps only the last) and the map it waits for. */
interface MapChange {
  seq: number;
  target: number | null;
  shownAt: number;
}

export const MapEditorProvider = ({ children }: { children: ReactNode }) => {
  const { session } = useAuth();
  const { currentCampaign, isMaster, tableCampaigns, refreshTableCampaigns } = useCampaign();
  const { currentSelection, myParticipations, participationsLoadedFor } = useCharacter();
  const { pathname } = useLocation();
  const [draft, setDraft] = useState<MapDraft>(createEmptyDraft);
  const { t } = useTranslation();
  /** Mask URL of the draft, read by `setImage` without making it depend on the draft. */
  const maskUrlRef = useRef<string | null>(null);
  maskUrlRef.current = draft.maskImageUrl;
  const [saved, setSaved] = useState<MapDraft>(createEmptyDraft);
  const [view, setView] = useState<MapView>(INITIAL_VIEW);
  const [resizeMode, setResizeMode] = useState(false);
  const [editMode, setEditModeState] = useState(false);
  const [paintMode, setPaintModeState] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [mapChanging, setMapChanging] = useState(false);
  const mapChangeRef = useRef<MapChange>({ seq: 0, target: null, shownAt: 0 });
  /** Campaign whose landing map was already decided (108 FR-020): once per campaign, so "Novo mapa" never brings it back. */
  const landedRef = useRef<number | null>(null);

  const handleError = (err: unknown): never => {
    setError(err instanceof Error ? err.message : 'Unknown error');
    throw err;
  };

  const userId = session?.user.userId ?? null;
  const campaignId = currentCampaign?.campaignId ?? null;
  const isDirty = !isSameDraft(draft, saved);
  const canEdit = draft.mapId === null || (isMaster && currentCampaign?.campaignId === draft.campaignId);
  const isCopy = draft.mapModelId !== null && draft.ownerUserId !== userId;
  const needsName = draft.mapModelId === null || isCopy;
  // 049: the open campaign map stays as it is while the table is paused or finished (as MapControls shows it).
  const frozen = draft.mapId !== null && draft.campaignId === currentCampaign?.campaignId
    && !canEditMap(currentCampaign?.status, isMaster);
  const canEditOpen = canEdit && !frozen;

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

  const toggleResizeMode = useCallback(() => {
    setResizeMode((prev) => {
      // Adjusting the image and painting both take the pointer: one at a time.
      if (!prev) setPaintModeState(false);
      return !prev;
    });
  }, []);

  // ---------- edit and paint modes (107) ----------

  const setEditMode = useCallback((on: boolean) => {
    setEditModeState(on);
    if (!on) {
      setResizeMode(false);
      setPaintModeState(false);
    }
  }, []);

  const setPaintMode = useCallback((on: boolean) => {
    setPaintModeState(on);
    if (on) setResizeMode(false);
  }, []);

  // Losing the right to edit the open map ends the edit mode, and with it the image adjustment and the paint.
  useEffect(() => {
    if (!canEditOpen) setEditMode(false);
  }, [canEditOpen, setEditMode]);

  // Another map: the paint mode ends (the edit mode itself stays, like a tool bar left open).
  useEffect(() => {
    setPaintModeState(false);
  }, [draft.mapId, draft.mapModelId]);

  // ---------- 3D view (034) ----------

  const [viewMode, setViewModeState] = useState<ViewMode>('2d');
  const [fov, setFovState] = useState(FOV_DEFAULT);
  const setFov = useCallback((value: number) => setFovState(clampFov(value)), []);
  // The quality level (053) is a preference of this device, not of a map: read once, written on every choice.
  const [viewQuality, setViewQualityState] = useState<ViewQuality>(readViewQuality);
  // Walking in the 3D view (055): the view hands its zoom here so the map controls can drive it.
  const storyZoomRef = useRef<((steps: number) => void) | null>(null);
  const [storyWalking, setStoryWalking] = useState(false);
  const registerStoryZoom = useCallback((handler: ((steps: number) => void) | null) => {
    storyZoomRef.current = handler;
    setStoryWalking(handler !== null);
  }, []);
  const storyZoom = useCallback((steps: number) => storyZoomRef.current?.(steps), []);
  const setViewQuality = useCallback((level: ViewQuality) => {
    setViewQualityState(level);
    writeViewQuality(level);
  }, []);

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
    if (isThreeD(mode)) setResizeMode(false);
  }, [draft.mapModelId]);

  // The paint exists only in 2D: any other view ends it.
  useEffect(() => {
    if (viewMode !== '2d') setPaintModeState(false);
  }, [viewMode]);

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

  const newMap = useCallback(() => {
    landedRef.current = campaignId;
    resetTo(createEmptyDraft());
  }, [resetTo, campaignId]);

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
    const master = isMasterOf(owner, session?.user.userId);
    // This runs before CharacterContext has the campaign (108 R4), so the user's participations are read here.
    const ownMapId = master ? null : storedOwnMap(
      owner.campaignId, await campaignCharacterService.listMine(owner.campaignId), readStoredSelections());
    return viewerMapDecision({
      isMaster: master,
      mapId: map.mapId,
      mapCampaignId: map.campaignId,
      campaignId: owner.campaignId,
      ownMapId,
    });
  };

  // Once logged in, reopen the remembered map (a campaign map through its map, else the model alone).
  useEffect(() => {
    markRestored(false);
    landedRef.current = null;
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
          // A player reopens only the map of his character, silently (039 FR-003, 108).
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

  // The chosen character's place on the table (108). Only `myParticipations`: the party hides other players' maps.
  const ownParticipation = ownParticipationOf(currentSelection, myParticipations);
  const ownMapId = ownParticipation?.mapId ?? null;
  const ownMapName = ownParticipation?.mapName ?? '';

  /** Opens a campaign map by id (following the character or reloading the same map). */
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
      // The character is on no map: the player sees none, so whatever map of this campaign was open goes away.
      if (draft.campaignId === campaign.campaignId) newMap();
      return { map: null, campaign, outcome: 'noMap' };
    }
    const opened = decision.kind === 'redirect' ? await mapService.getById(decision.mapId!) : map;
    await loadMapModel(opened.mapModelId, opened);
    return { map: opened, campaign, outcome: decision.kind === 'redirect' ? 'redirected' : 'opened' };
  // eslint-disable-next-line react-hooks/exhaustive-deps -- viewerDecisionFor only reads campaignOfMap and the session
  }, [loadMapModel, campaignOfMap, draft.campaignId, newMap, session?.user.userId]);

  // ---------- "O mestre está mudando o mapa" (108 R11) ----------

  const stopMapChange = useCallback(() => {
    const change = mapChangeRef.current;
    change.seq += 1;
    change.target = null;
    setMapChanging(false);
  }, []);

  /** Only the live `character.map` calls this: a resync, another chosen character or opening the campaign say nothing. */
  const startMapChange = useCallback((mapId: number) => {
    const change = mapChangeRef.current;
    change.seq += 1;
    const { seq } = change;
    change.target = mapId;
    change.shownAt = Date.now();
    setMapChanging(true);
    window.setTimeout(() => {
      if (mapChangeRef.current.seq === seq) stopMapChange();
    }, MAP_CHANGE_MAX_MS);
  }, [stopMapChange]);

  /** The awaited map is ready: the message goes once it was on screen long enough. Another map changes nothing (A→B→C). */
  const finishMapChange = useCallback((mapId: number) => {
    const change = mapChangeRef.current;
    if (change.target !== mapId) return;
    const { seq } = change;
    window.setTimeout(() => {
      if (mapChangeRef.current.seq === seq) stopMapChange();
    }, Math.max(0, MAP_CHANGE_MIN_MS - (Date.now() - change.shownAt)));
  }, [stopMapChange]);

  /** A message left from another campaign or session has nothing to wait for. */
  useEffect(() => stopMapChange, [campaignId, userId, stopMapChange]);

  /**
   * Players see only the map of their chosen character (108): on entering the campaign (after the restore, so it wins
   * over the remembered map), whenever the character changes map or another character is chosen, and whenever another map
   * of the campaign ends up open. With the character off every map the open map of the campaign is closed. Unsaved changes
   * are never discarded.
   */
  const followedRef = useRef<string | null>(null);
  /** Map being opened by this effect: it may run again before the answer arrives. */
  const followingRef = useRef<number | null>(null);
  useEffect(() => {
    if (!restored) return;
    // Participations of another campaign (or none yet) say nothing: "still loading" must not read as "off every map".
    if (!isMaster && campaignId !== null && participationsLoadedFor !== campaignId) return;
    // Two triggers: the campaign or the character's map changed (follow), or another map of this campaign is open.
    // A library model (no mapId) or a map of another campaign is left alone.
    const key = `${campaignId}:${ownMapId}`;
    const switched = followedRef.current !== key;
    followedRef.current = key;
    const otherMapOfCampaign = draft.mapId !== null && draft.campaignId === campaignId && draft.mapId !== ownMapId;
    if (!switched && !otherMapOfCampaign) return;
    if (isMaster || campaignId === null) return;
    if (ownMapId === null) {
      stopMapChange();
      if (draft.mapId !== null && draft.campaignId === campaignId && !isDirty) newMap();
      return;
    }
    if (draft.mapId === ownMapId) {
      finishMapChange(ownMapId);
      return;
    }
    if (isDirty) {
      stopMapChange();
      // Followed once the changes are saved or discarded.
      followedRef.current = null;
      toast.warning(t('realtime.mapChangedUnsaved', { name: ownMapName }));
      return;
    }
    if (followingRef.current === ownMapId) return;
    const target = ownMapId;
    followingRef.current = target;
    const giveUp = () => {
      if (mapChangeRef.current.target === target) stopMapChange();
    };
    openCampaignMap(target)
      .then((opened) => {
        if (opened) finishMapChange(target);
        else giveUp();
      })
      .catch(() => {
        giveUp();
        toast.error(t('realtime.followFailed'));
      })
      .finally(() => {
        if (followingRef.current === target) followingRef.current = null;
      });
  }, [restored, campaignId, ownMapId, ownMapName, participationsLoadedFor, isMaster, isDirty, draft.mapId, draft.campaignId,
    openCampaignMap, newMap, stopMapChange, finishMapChange, t]);

  /**
   * Where the master lands on opening a campaign with no map chosen (108 FR-020): the map with most characters. Decided
   * once per campaign, whatever the answer: a map already open (or an unsaved new one) also settles it, so closing it
   * later doesn't bring this back. Only on the campaign's own address; the library and the root may still become it.
   */
  useEffect(() => {
    if (!restored || !isMaster || currentCampaign === null || landedRef.current === currentCampaign.campaignId) return;
    if (draft.mapModelId !== null || isDirty) {
      landedRef.current = currentCampaign.campaignId;
      return;
    }
    const path = parseTablePath(pathname);
    if (path.kind !== 'campaign' || path.slug !== currentCampaign.slug) return;
    const table = tableCampaigns.find((campaign) => campaign.campaignId === currentCampaign.campaignId);
    if (!table) return;
    landedRef.current = currentCampaign.campaignId;
    const mapId = masterDefaultMap(table.maps);
    if (mapId !== null) openCampaignMap(mapId).catch(() => toast.error(t('realtime.followFailed')));
  }, [restored, isMaster, currentCampaign, draft.mapModelId, isDirty, pathname, tableCampaigns, openCampaignMap, t]);

  useTableEvents((event) => {
    if (event.type === TABLE_EVENT.characterMap) {
      const moved = event.data as CharacterMapEvent | null;
      if (isMaster || isDirty || !moved || moved.campaignCharacterId !== ownParticipation?.campaignCharacterId) return;
      if (moved.mapId === null) stopMapChange();
      else if (moved.mapId !== draft.mapId) startMapChange(moved.mapId);
      else {
        // Back to the map on screen before the trip ended (A→B→A): nothing left to wait for.
        mapChangeRef.current.target = moved.mapId;
        finishMapChange(moved.mapId);
      }
    } else if (event.type === TABLE_EVENT.mapSaved) {
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
    draft, saved, isDirty, canEdit, needsName, isCopy, hexSize, gridSize, view, resizeMode, editMode, setEditMode,
    paintMode, setPaintMode, loading, error, mapChanging,
    zoomAt, zoomIn, zoomOut, panBy, centerOn,
    setImage, setImageLayout, setGridSize, toggleResizeMode,
    setMaskImage, setBackgroundImage, setWallTextureImage, viewMode, setViewMode, fov, setFov, viewQuality, setViewQuality,
    storyWalking, storyZoom, registerStoryZoom,
    newMap, loadMapModel, openCampaignMapBySlug, discardChanges, saveMap, clearError,
  };

  return <MapEditorContext.Provider value={value}>{children}</MapEditorContext.Provider>;
};

export default MapEditorContext;
