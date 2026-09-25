import { CHARACTER_STORAGE_KEY } from '../Services/apiHelpers';
import type { CharacterInfo } from '../types/character';
import { CAMPAIGN_CHARACTER_STATUS } from '../types/campaignCharacter';
import type { CampaignCharacterInfo, CampaignCharacterStatus } from '../types/campaignCharacter';

/** What the user plays as in a campaign: the master ("gm") or one of their characters (id). */
export type CharacterSelection = 'gm' | number;

export type CharacterOption = { key: 'gm' } | { key: number; character: CharacterInfo };

/**
 * Options of the "Personagem atual" combo: "Mestre (GM)" for the master, then only the user's own
 * characters approved in the campaign (spec Q1 = A), in the order of `myCharacters`.
 */
export const buildCharacterOptions = ({ isMaster, myCharacters, myParticipations }: {
  isMaster: boolean;
  myCharacters: CharacterInfo[];
  myParticipations: CampaignCharacterInfo[];
}): CharacterOption[] => {
  const approved = new Set(myParticipations
    .filter((p) => p.status === CAMPAIGN_CHARACTER_STATUS.approved)
    .map((p) => p.characterId));
  const characters = myCharacters
    .filter((c) => approved.has(c.characterId))
    .map((character) => ({ key: character.characterId, character }));
  return isMaster ? [{ key: 'gm' }, ...characters] : characters;
};

/** Keeps the stored choice while it is still an option; otherwise the first option, or null. */
export const resolveSelection = (
  stored: CharacterSelection | null | undefined,
  options: CharacterOption[],
): CharacterSelection | null => {
  if (stored != null && options.some((o) => o.key === stored)) return stored;
  return options[0]?.key ?? null;
};

/** Action shown for one of the user's characters in "Selecionar Personagem" (FR-014). */
export type ParticipationAction = 'request' | 'respondInvite' | 'waiting' | 'waitInvite' | 'use';

export const participationAction = (status?: CampaignCharacterStatus): ParticipationAction => {
  switch (status) {
    case CAMPAIGN_CHARACTER_STATUS.invited: return 'respondInvite';
    case CAMPAIGN_CHARACTER_STATUS.requestedAccess: return 'waiting';
    case CAMPAIGN_CHARACTER_STATUS.approved: return 'use';
    case CAMPAIGN_CHARACTER_STATUS.denied: return 'waitInvite';
    default: return 'request';
  }
};

/** Invite search (FR-011): outside the campaign or denied → can be invited; else show the status. */
export const inviteAction = (status?: CampaignCharacterStatus): 'invite' | 'status' =>
  status === undefined || status === CAMPAIGN_CHARACTER_STATUS.denied ? 'invite' : 'status';

/** Stored choices by campaign id; empty when missing or unreadable. */
export const readStoredSelections = (): Record<string, CharacterSelection> => {
  try {
    const parsed: unknown = JSON.parse(localStorage.getItem(CHARACTER_STORAGE_KEY) ?? '{}');
    return parsed && typeof parsed === 'object' ? parsed as Record<string, CharacterSelection> : {};
  } catch {
    return {};
  }
};

/** Remembers (or forgets, with null) the choice for a campaign. */
export const writeStoredSelection = (campaignId: number, value: CharacterSelection | null): void => {
  const all = readStoredSelections();
  if (value === null) delete all[campaignId];
  else all[campaignId] = value;
  try {
    localStorage.setItem(CHARACTER_STORAGE_KEY, JSON.stringify(all));
  } catch {
    // Storage full or blocked: the choice just is not remembered.
  }
};
