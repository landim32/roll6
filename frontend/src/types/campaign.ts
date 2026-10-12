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
  /** Campaign map the master opened last; players follow it (017). */
  currentMapId: number | null;
  createdAt: string;
  updatedAt: string;
}

/** Campaign in the table combo, with the active map the table follows. */
export interface CampaignTableInfo {
  campaignId: number;
  name: string;
  slug: string;
  /** Campaign status (049). */
  status: number;
  /** Free mode (054). */
  freeMode: boolean;
  isMaster: boolean;
  currentMapId: number | null;
  currentMapName: string | null;
  currentMapSlug: string | null;
}

/** Data to create a campaign. */
export interface CampaignInsertInfo {
  name: string;
  open: boolean;
}
