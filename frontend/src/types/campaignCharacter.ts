import type { SheetFileType } from './image';
import type { Posture } from './mapToken';

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
  /** Current life/energy in this campaign (may be zero or negative). Posture is separate. */
  currentLife: number;
  currentEnergy: number;
  /** The character's totals. */
  totalLife: number;
  totalEnergy: number;
  /** The character's move. */
  characterMove: number;
  /** Free-text condition of the character in this campaign (not the participation `status`). */
  characterStatus: string | null;
  /** Standing, down or out of combat in this campaign (031). */
  posture: Posture;
  /** The character's token; without one, placing it on the map asks for a token. */
  characterTokenId: number | null;
  createdAt: string;
  updatedAt: string;
}

/** Body of the request-access and invite calls. */
export interface CampaignCharacterRequestInfo {
  campaignId: number;
  characterId: number;
}

/** A participation with the campaign's own copy of the character sheet (the lists leave it out). */
export interface CampaignCharacterDetailInfo extends CampaignCharacterInfo {
  /** The character's sheet in this campaign ("Ficha da Campanha"), copied when they joined (032). */
  sheet: string | null;
  /** The character's own sheet, read-only here (only the owner changes it). */
  characterSheet: string | null;
  characterTokenName: string | null;
  characterTokenImageUrl: string | null;
  /** Stored name ({guid}.{ext}) of this campaign's sheet file; send it back to keep the file (032). */
  sheetFile: string | null;
  /** Presigned URL of this campaign's sheet file (032) — not the character's. */
  sheetFileUrl: string | null;
  sheetFileType: SheetFileType | null;
}

/** What the owner or the master changes in a participation (current values at most the totals). */
export interface CampaignCharacterUpdateInfo {
  currentLife: number;
  currentEnergy: number;
  characterStatus: string | null;
  sheet: string | null;
  /** New token of the character (saved on the character); null keeps the current one. */
  tokenId: number | null;
  /** New posture (031); null/omitted keeps the current one. */
  posture?: Posture | null;
  /** This campaign's sheet file: a stored name replaces it, '' removes it, null/omitted keeps it (032). */
  sheetFile?: string | null;
}
