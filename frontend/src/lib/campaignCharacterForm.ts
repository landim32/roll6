import type { CampaignCharacterUpdateInfo } from '../types/campaignCharacter';
import type { Posture } from '../types/mapToken';

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

export type CampaignAreaError = 'currentMoveInvalid' | 'characterStatusTooLong' | 'campaignSheetTooLong';

/** The Deslocamento (037): a whole number, 0 or more, with no upper limit (it may exceed the character's move). */
const isValidMove = (value: string) => /^\d+$/.test(value.trim());

/**
 * Deslocamento, status and campaign sheet as typed; the current values are checked by `validateVitals`.
 * Without `currentMove` (callers that don't edit it) the Deslocamento is not checked.
 */
export const validateCampaignArea = ({ currentMove, characterStatus, sheet }: {
  currentMove?: string;
  characterStatus: string;
  sheet: string;
}): CampaignAreaError | null => {
  if (currentMove !== undefined && !isValidMove(currentMove)) return 'currentMoveInvalid';
  if (characterStatus.trim().length > MAX_CHARACTER_STATUS) return 'characterStatusTooLong';
  if (sheet.length > MAX_CAMPAIGN_SHEET) return 'campaignSheetTooLong';
  return null;
};

/**
 * API payload from valid values: numbers, trimmed status and blank texts as null; no token keeps the current one,
 * and so does no posture (031), no sheet file (032 — an empty string removes it) and no Deslocamento (037).
 */
export const toCampaignUpdate = ({ currentLife, currentEnergy, currentMove, characterStatus, sheet, tokenId = null, posture = null, sheetFile = null }: {
  currentLife: string;
  currentEnergy: string;
  currentMove?: string;
  characterStatus: string;
  sheet: string;
  tokenId?: number | null;
  posture?: Posture | null;
  sheetFile?: string | null;
}): CampaignCharacterUpdateInfo => ({
  currentLife: Number(currentLife),
  currentEnergy: Number(currentEnergy),
  currentMove: currentMove === undefined || currentMove.trim() === '' ? null : Number(currentMove),
  characterStatus: characterStatus.trim() || null,
  sheet: sheet.trim() ? sheet : null,
  tokenId,
  posture,
  sheetFile,
});
