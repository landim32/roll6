import type { MapModelInfo, MapModelInsertInfo } from '../types/mapModel';
import type { MapInfo } from '../types/map';

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
}

/** A brand-new map: default grid, no image. */
export const createEmptyDraft = (): MapDraft => ({
  mapModelId: null,
  mapId: null,
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
});

/** Draft from a library map, optionally opened through a campaign map. */
export const draftFromMapModel = (model: MapModelInfo, map?: MapInfo | null): MapDraft => ({
  mapModelId: model.mapModelId,
  mapId: map?.mapId ?? null,
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
});

/** Fields that are saved; anything else (ids, URLs, display name) does not make the map dirty. */
const SAVED_FIELDS: (keyof MapDraft)[] = [
  'image', 'gridWidth', 'gridHeight', 'imageWidth', 'imageHeight', 'imageTop', 'imageLeft',
];

/** True when both drafts would save the same content. */
export const isSameDraft = (a: MapDraft, b: MapDraft): boolean => SAVED_FIELDS.every((field) => a[field] === b[field]);

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
});
