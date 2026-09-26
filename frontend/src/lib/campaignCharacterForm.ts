import type { CampaignCharacterUpdateInfo } from '../types/campaignCharacter';

/**
 * How a party card opens the character form: the owner changes everything, the master only what
 * belongs to the campaign, everyone else just reads (010 FR-006/007/008). Constants: no `enum`.
 */
export const PARTICIPATION_MODE = {
  owner: 'owner',
  master: 'master',
  viewer: 'viewer',
} as const;

export type ParticipationMode = (typeof PARTICIPATION_MODE)[keyof typeof PARTICIPATION_MODE];

/** The owner rule wins when the master is also the character's owner. */
export const participationMode = (isMaster: boolean, isOwner: boolean): ParticipationMode => {
  if (isOwner) return PARTICIPATION_MODE.owner;
  return isMaster ? PARTICIPATION_MODE.master : PARTICIPATION_MODE.viewer;
};

/** Same limits as the backend CampaignCharacter.UpdatePlay. */
export const MAX_CHARACTER_STATUS = 260;
export const MAX_CAMPAIGN_SHEET = 20000;

export type CampaignAreaError = 'characterStatusTooLong' | 'campaignSheetTooLong';

/** Status and campaign sheet as typed; the current values are checked by `validateVitals`. */
export const validateCampaignArea = ({ characterStatus, sheet }: { characterStatus: string; sheet: string }): CampaignAreaError | null => {
  if (characterStatus.trim().length > MAX_CHARACTER_STATUS) return 'characterStatusTooLong';
  if (sheet.length > MAX_CAMPAIGN_SHEET) return 'campaignSheetTooLong';
  return null;
};

/** API payload from valid values: numbers, trimmed status and blank texts as null. */
export const toCampaignUpdate = ({ currentLife, currentEnergy, characterStatus, sheet }: {
  currentLife: string;
  currentEnergy: string;
  characterStatus: string;
  sheet: string;
}): CampaignCharacterUpdateInfo => ({
  currentLife: Number(currentLife),
  currentEnergy: Number(currentEnergy),
  characterStatus: characterStatus.trim() || null,
  sheet: sheet.trim() ? sheet : null,
});
