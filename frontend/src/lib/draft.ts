import { MAP_KIND } from '../types/mapModel';
import type { MapModelInfo, MapModelInsertInfo } from '../types/mapModel';
import type { MapInfo } from '../types/map';
import type { Offset } from './hexGrid';
import { fromWallPairs, sameWalls, toWallPairs, trimWalls } from './storyWalls';

/** Default grid (same as the backend). */
export const DEFAULT_GRID_SIZE = 20;
export const MIN_GRID_SIZE = 1;
export const MAX_GRID_SIZE = 500;

/** What is on screen: the map being edited (saved only when the whole map is saved). */
export interface MapDraft {
  /** null = new map, not in the library yet. */
  mapModelId: number | null;
  /** Campaign map, when opened from "Mapas da campanha". */
  mapId: number | null;
  /** Slug of the campaign map. Not a saved field, so it does not make the draft dirty. */
  mapSlug: string | null;
  /** Campaign of the campaign map (to know who is the master). */
  campaignId: number | null;
  /** Owner of the map model; different from the user → saving creates a copy. */
  ownerUserId: number | null;
  /** Name shown in the menu (campaign map name or model name). */
  name: string;
  /** Name of the map model in the library (used when saving). */
  modelName: string;
  description: string | null;
  image: string | null;
  imageUrl: string | null;
  gridWidth: number;
  gridHeight: number;
  imageWidth: number | null;
  imageHeight: number | null;
  imageTop: number;
  imageLeft: number;
  /** MAP_KIND value (033). */
  kind: number;
  /** Wall cells, sorted by row then column (see lib/storyWalls). Kept on a 2D map, where they do nothing. */
  walls: Offset[];
  /** Stored sky/horizon image of the 3D view. */
  skyImage: string | null;
  /** Temporary URL of the sky image. Not saved. */
  skyImageUrl: string | null;
}

/** A brand-new map: default grid, no image. */
export const createEmptyDraft = (): MapDraft => ({
  mapModelId: null,
  mapId: null,
  mapSlug: null,
  campaignId: null,
  ownerUserId: null,
  name: '',
  modelName: '',
  description: null,
  image: null,
  imageUrl: null,
  gridWidth: DEFAULT_GRID_SIZE,
  gridHeight: DEFAULT_GRID_SIZE,
  imageWidth: null,
  imageHeight: null,
  imageTop: 0,
  imageLeft: 0,
  kind: MAP_KIND.battle,
  walls: [],
  skyImage: null,
  skyImageUrl: null,
});

/** Draft from a library map, optionally opened through a campaign map. */
export const draftFromMapModel = (model: MapModelInfo, map?: MapInfo | null): MapDraft => ({
  mapModelId: model.mapModelId,
  mapId: map?.mapId ?? null,
  mapSlug: map?.slug ?? null,
  campaignId: map?.campaignId ?? null,
  ownerUserId: model.userId,
  name: map?.name ?? model.name,
  modelName: model.name,
  description: model.description,
  image: model.image,
  imageUrl: model.imageUrl,
  gridWidth: model.gridWidth,
  gridHeight: model.gridHeight,
  imageWidth: model.imageWidth,
  imageHeight: model.imageHeight,
  imageTop: model.imageTop,
  imageLeft: model.imageLeft,
  kind: model.kind ?? MAP_KIND.battle,
  walls: fromWallPairs(model.walls),
  skyImage: model.skyImage ?? null,
  skyImageUrl: model.skyImageUrl ?? null,
});

/** Fields that are saved; anything else (ids, URLs, display name) does not make the map dirty. */
const SAVED_FIELDS: (keyof MapDraft)[] = [
  'image', 'gridWidth', 'gridHeight', 'imageWidth', 'imageHeight', 'imageTop', 'imageLeft', 'kind', 'skyImage',
];

/** True when both drafts would save the same content. */
export const isSameDraft = (a: MapDraft, b: MapDraft): boolean =>
  SAVED_FIELDS.every((field) => a[field] === b[field]) && sameWalls(a.walls, b.walls);

/** True when the draft is a story map (033): walls block pieces and the 3D view is offered. */
export const isStoryMap = (draft: Pick<MapDraft, 'kind'>): boolean => draft.kind === MAP_KIND.story;

/** Walls that count now: those of a story map, none on a 2D map (mirror of MapModel.ActiveWalls). */
export const activeWalls = (draft: Pick<MapDraft, 'kind' | 'walls'>): Offset[] => (isStoryMap(draft) ? draft.walls : []);

/** Payload for create/update of the map model. */
export const toMapModelInsert = (draft: MapDraft, name: string, description: string | null): MapModelInsertInfo => ({
  name,
  description,
  image: draft.image,
  gridWidth: draft.gridWidth,
  gridHeight: draft.gridHeight,
  imageWidth: draft.imageWidth,
  imageHeight: draft.imageHeight,
  imageTop: draft.imageTop,
  imageLeft: draft.imageLeft,
  kind: draft.kind,
  walls: toWallPairs(trimWalls(draft.walls, draft.gridWidth, draft.gridHeight)),
  skyImage: draft.skyImage,
});
