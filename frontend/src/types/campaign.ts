/** Campaign types — mirror the backend Campaign DTOs. */

/** Campaign as returned by the API. */
export interface CampaignInfo {
  campaignId: number;
  /** Owner (master) user id. */
  userId: number;
  ownerName: string;
  name: string;
  /** Unique URL slug. Set on creation and never changed. */
  slug: string;
  /** Open campaigns approve access requests immediately. */
  open: boolean;
  /** 1 Preparando, 2 Ativa, 3 Pausada, 4 Finalizada (049) — see `lib/campaignStatus`. */
  status: number;
  /** Turn in progress (016), starts at 1. */
  currentTurn: number;
  /** Free mode (054) — see `lib/freeMode`. A missing value reads as false. */
  freeMode: boolean;
  /** Pending notice over the chat (072) — see `lib/freeMode.showPending`. A missing value reads as true. */
  pendingNotice?: boolean;
  /** GM mode (096) — see `lib/gmMode`. A missing value reads as false. */
  gmMode?: boolean;
  /** The campaign's picture on the library cards (090): the stored name and its presigned URL; null without one. */
  image?: string | null;
  imageUrl?: string | null;
  createdAt: string;
  updatedAt: string;
}

/** Campaign in the table combo, with its maps. */
export interface CampaignTableInfo {
  campaignId: number;
  name: string;
  slug: string;
  /** Campaign status (049). */
  status: number;
  /** Free mode (054). */
  freeMode: boolean;
  /** Pending notice over the chat (072). */
  pendingNotice?: boolean;
  /** Presigned URL of the campaign's picture (090); null without one. */
  imageUrl?: string | null;
  isMaster: boolean;
  /** The master gets every active map; a player only the maps where his characters are (108). */
  maps: TableMapInfo[];
}

/** A map in the table combo (078). */
export interface TableMapInfo {
  mapId: number;
  name: string;
  slug: string;
  status: number;
  /** Characters on the map (108): all of them for the master, only his own for a player. */
  characterCount: number;
  /** Their ids, same rule. */
  characterIds: number[];
}

/** Data to create a campaign. */
export interface CampaignInsertInfo {
  name: string;
  open: boolean;
  /** The campaign's picture (090): a name from `POST /api/image`; optional. */
  image?: string | null;
}
