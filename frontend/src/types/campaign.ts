/** Campaign types — mirror the backend Campaign DTOs. */

/** Campaign as returned by the API. */
export interface CampaignInfo {
  campaignId: number;
  /** Owner (master) user id. */
  userId: number;
  ownerName: string;
  name: string;
  /** Open campaigns approve access requests immediately. */
  open: boolean;
  /** Turn in progress (016), starts at 1. */
  currentTurn: number;
  createdAt: string;
  updatedAt: string;
}

/** Data to create a campaign. */
export interface CampaignInsertInfo {
  name: string;
  open: boolean;
}
