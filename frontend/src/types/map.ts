/** Campaign map types — a map instance created from a map model inside a campaign. */

/** Map status values: 1 Active, 2 Archived, 3 Deleted. */
export const MAP_STATUS_ACTIVE = 1;
export const MAP_STATUS_ARCHIVED = 2;
export const MAP_STATUS_DELETED = 3;

/** Campaign map as returned by the API (with the model's grid/image fields). */
export interface MapInfo {
  mapId: number;
  campaignId: number;
  mapModelId: number;
  mapModelName: string;
  mapModelImageUrl: string | null;
  gridWidth: number;
  gridHeight: number;
  imageWidth: number | null;
  imageHeight: number | null;
  imageTop: number;
  imageLeft: number;
  hexSize: number | null;
  /** Owner (master) user id. */
  userId: number;
  sequence: number;
  name: string;
  /** One of the MAP_STATUS_* values. */
  status: number;
  createdAt: string;
  updatedAt: string;
}

/** Data to add a map model to a campaign. */
export interface MapInsertInfo {
  campaignId: number;
  mapModelId: number;
}
