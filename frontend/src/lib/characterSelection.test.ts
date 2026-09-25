import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  buildCharacterOptions, inviteAction, participationAction, readStoredSelections, resolveSelection, writeStoredSelection,
} from './characterSelection';
import type { CharacterInfo } from '../types/character';
import { CAMPAIGN_CHARACTER_STATUS } from '../types/campaignCharacter';
import type { CampaignCharacterInfo, CampaignCharacterStatus } from '../types/campaignCharacter';

const character = (characterId: number, name: string): CharacterInfo => ({
  characterId, userId: 1, name, sheet: null, life: 0, energy: 0, status: null, move: 0,
  image: null, imageUrl: null, createdAt: '', updatedAt: '',
});

const participation = (characterId: number, status: CampaignCharacterStatus): CampaignCharacterInfo => ({
  campaignCharacterId: characterId * 10, campaignId: 5, campaignName: 'Mesa', campaignOwnerName: 'Ana',
  characterId, characterName: '', characterImageUrl: null, characterOwnerId: 1, characterOwnerName: '',
  status, currentLife: 0, currentEnergy: 0, totalLife: 0, totalEnergy: 0, createdAt: '', updatedAt: '',
});

const myCharacters = [character(1, 'Aria'), character(2, 'Bram'), character(3, 'Cid')];
const myParticipations = [
  participation(1, CAMPAIGN_CHARACTER_STATUS.approved),
  participation(2, CAMPAIGN_CHARACTER_STATUS.requestedAccess),
  participation(3, CAMPAIGN_CHARACTER_STATUS.approved),
  // A participation of a character that is not the user's must never become an option.
  participation(99, CAMPAIGN_CHARACTER_STATUS.approved),
];

describe('buildCharacterOptions', () => {
  it('puts the GM first for the master, then the own approved characters', () => {
    const keys = buildCharacterOptions({ isMaster: true, myCharacters, myParticipations }).map((o) => o.key);
    expect(keys).toEqual(['gm', 1, 3]);
  });

  it('has no GM option for players and ignores pending and foreign characters', () => {
    const keys = buildCharacterOptions({ isMaster: false, myCharacters, myParticipations }).map((o) => o.key);
    expect(keys).toEqual([1, 3]);
  });

  it('is empty for a player without approved characters', () => {
    expect(buildCharacterOptions({ isMaster: false, myCharacters, myParticipations: [] })).toEqual([]);
  });
});

describe('resolveSelection', () => {
  const options = buildCharacterOptions({ isMaster: true, myCharacters, myParticipations });

  it('keeps a stored choice that is still valid', () => {
    expect(resolveSelection(3, options)).toBe(3);
    expect(resolveSelection('gm', options)).toBe('gm');
  });

  it('falls back to the first option when the stored one is gone', () => {
    expect(resolveSelection(2, options)).toBe('gm');
    expect(resolveSelection(undefined, options)).toBe('gm');
  });

  it('returns null without options', () => {
    expect(resolveSelection(1, [])).toBeNull();
  });
});

describe('actions by status', () => {
  it.each([
    [undefined, 'request'],
    [CAMPAIGN_CHARACTER_STATUS.invited, 'respondInvite'],
    [CAMPAIGN_CHARACTER_STATUS.requestedAccess, 'waiting'],
    [CAMPAIGN_CHARACTER_STATUS.approved, 'use'],
    [CAMPAIGN_CHARACTER_STATUS.denied, 'waitInvite'],
  ] as const)('participationAction(%s) = %s', (status, action) => {
    expect(participationAction(status)).toBe(action);
  });

  it.each([
    [undefined, 'invite'],
    [CAMPAIGN_CHARACTER_STATUS.denied, 'invite'],
    [CAMPAIGN_CHARACTER_STATUS.invited, 'status'],
    [CAMPAIGN_CHARACTER_STATUS.requestedAccess, 'status'],
    [CAMPAIGN_CHARACTER_STATUS.approved, 'status'],
  ] as const)('inviteAction(%s) = %s', (status, action) => {
    expect(inviteAction(status)).toBe(action);
  });
});

describe('stored selections', () => {
  // Tests run in the node environment: a minimal in-memory localStorage.
  beforeEach(() => {
    const store = new Map<string, string>();
    vi.stubGlobal('localStorage', {
      getItem: (key: string) => store.get(key) ?? null,
      setItem: (key: string, value: string) => { store.set(key, value); },
      removeItem: (key: string) => { store.delete(key); },
    });
  });

  it('remembers one choice per campaign and forgets with null', () => {
    writeStoredSelection(5, 'gm');
    writeStoredSelection(6, 3);
    expect(readStoredSelections()).toEqual({ 5: 'gm', 6: 3 });
    writeStoredSelection(5, null);
    expect(readStoredSelections()).toEqual({ 6: 3 });
  });

  it('ignores unreadable data', () => {
    localStorage.setItem('simple-tabletop-map:character', '{broken');
    expect(readStoredSelections()).toEqual({});
  });
});
