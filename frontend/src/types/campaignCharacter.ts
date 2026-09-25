/** Campaign participation types — mirror the backend CampaignCharacter DTOs. */

/** Participation status (backend CampaignCharacterStatus); constants because `enum` is not allowed. */
export const CAMPAIGN_CHARACTER_STATUS = {
  invited: 1,
  requestedAccess: 2,
  approved: 3,
  denied: 4,
} as const;

export type CampaignCharacterStatus = (typeof CAMPAIGN_CHARACTER_STATUS)[keyof typeof CAMPAIGN_CHARACTER_STATUS];

/** A character in a campaign, with campaign/owner names. */
export interface CampaignCharacterInfo {
  campaignCharacterId: number;
  campaignId: number;
  campaignName: string;
  campaignOwnerName: string;
  characterId: number;
  characterName: string;
  characterImageUrl: string | null;
  characterOwnerId: number;
  characterOwnerName: string;
  status: CampaignCharacterStatus;
  /** Current life/energy in this campaign (may be zero or negative: fallen). */
  currentLife: number;
  currentEnergy: number;
  /** The character's totals. */
  totalLife: number;
  totalEnergy: number;
  createdAt: string;
  updatedAt: string;
}

/** Body of the request-access and invite calls. */
export interface CampaignCharacterRequestInfo {
  campaignId: number;
  characterId: number;
}

/** Body of the vitals update (at most the character's totals). */
export interface CampaignCharacterVitalsInfo {
  currentLife: number;
  currentEnergy: number;
}
