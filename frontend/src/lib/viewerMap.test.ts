import { describe, expect, it } from 'vitest';
import {
  isMasterOf, masterDefaultMap, ownMapOf, ownParticipationOf, storedOwnMap, viewerMapDecision, visibleCampaignMaps,
} from './viewerMap';
import { CAMPAIGN_CHARACTER_STATUS } from '../types/campaignCharacter';
import type { CampaignCharacterInfo } from '../types/campaignCharacter';

const CAMPAIGN = 10;
const A = 1;
const B = 2;

const decide = (over: Partial<Parameters<typeof viewerMapDecision>[0]>) => viewerMapDecision({
  isMaster: false, mapId: B, mapCampaignId: CAMPAIGN, campaignId: CAMPAIGN, ownMapId: A, ...over,
});

const mine = (characterId: number, mapId: number | null, status: number = CAMPAIGN_CHARACTER_STATUS.approved) =>
  ({ characterId, mapId, status } as CampaignCharacterInfo);

describe('isMasterOf', () => {
  it('is the campaign owner', () => {
    expect(isMasterOf({ userId: 1 }, 1)).toBe(true);
    expect(isMasterOf({ userId: 1 }, 2)).toBe(false);
    expect(isMasterOf({ userId: 1 }, null)).toBe(false);
    expect(isMasterOf({ userId: 1 }, undefined)).toBe(false);
  });
});

describe('viewerMapDecision', () => {
  it('lets the master open any map', () => {
    expect(decide({ isMaster: true })).toEqual({ kind: 'open' });
    expect(decide({ isMaster: true, ownMapId: null })).toEqual({ kind: 'open' });
  });

  it("lets a player open his character's map", () => {
    expect(decide({ mapId: A })).toEqual({ kind: 'open' });
  });

  it("sends a player on another map of the campaign to his character's", () => {
    expect(decide({})).toEqual({ kind: 'redirect', mapId: A });
  });

  it('opens nothing for a player whose character is off every map', () => {
    expect(decide({ ownMapId: null })).toEqual({ kind: 'none' });
  });

  it('does not apply to a map of another campaign', () => {
    expect(decide({ mapCampaignId: 99 })).toEqual({ kind: 'open' });
  });
});

describe('visibleCampaignMaps', () => {
  const items = [{ mapId: A, name: 'A' }, { mapId: B, name: 'B' }];

  it('shows the master every map', () => {
    expect(visibleCampaignMaps(items, { isMaster: true, ownMapId: A })).toEqual(items);
  });

  it("shows a player only his character's map", () => {
    expect(visibleCampaignMaps(items, { isMaster: false, ownMapId: A })).toEqual([items[0]]);
    expect(visibleCampaignMaps(items, { isMaster: false, ownMapId: null })).toEqual([]);
  });
});

describe('ownMapOf', () => {
  const participations = [mine(3, A), mine(4, B), mine(5, null), mine(6, B, CAMPAIGN_CHARACTER_STATUS.requestedAccess)];

  it('is the map of the chosen character, whichever others the user has', () => {
    expect(ownMapOf(3, participations)).toBe(A);
    expect(ownMapOf(4, participations)).toBe(B);
  });

  it('is null off every map, for the GM, without a choice or for a character not approved', () => {
    expect(ownMapOf(5, participations)).toBeNull();
    expect(ownMapOf('gm', participations)).toBeNull();
    expect(ownMapOf(null, participations)).toBeNull();
    expect(ownMapOf(99, participations)).toBeNull();
    expect(ownMapOf(6, participations)).toBeNull();
  });

  it('gives the participation itself too', () => {
    expect(ownParticipationOf(4, participations)?.mapId).toBe(B);
    expect(ownParticipationOf('gm', participations)).toBeNull();
  });
});

describe('storedOwnMap', () => {
  const participations = [mine(3, A), mine(4, B), mine(6, B, CAMPAIGN_CHARACTER_STATUS.invited)];

  it('uses the choice remembered for the campaign', () => {
    expect(storedOwnMap(CAMPAIGN, participations, { [CAMPAIGN]: 4 })).toBe(B);
  });

  it('falls back to the first approved character, like the combo', () => {
    expect(storedOwnMap(CAMPAIGN, participations, {})).toBe(A);
    expect(storedOwnMap(CAMPAIGN, participations, { [CAMPAIGN]: 6 })).toBe(A);
    expect(storedOwnMap(CAMPAIGN, participations, { [CAMPAIGN]: 'gm' })).toBe(A);
  });

  it('is null without an approved character', () => {
    expect(storedOwnMap(CAMPAIGN, [mine(6, B, CAMPAIGN_CHARACTER_STATUS.invited)], {})).toBeNull();
    expect(storedOwnMap(CAMPAIGN, [], { [CAMPAIGN]: 3 })).toBeNull();
  });
});

describe('108: masterDefaultMap', () => {
  it('picks the map with most characters', () => {
    expect(masterDefaultMap([{ mapId: 7, characterCount: 1 }, { mapId: 5, characterCount: 3 }])).toBe(5);
  });

  it('breaks a tie with the newest map', () => {
    expect(masterDefaultMap([{ mapId: 5, characterCount: 2 }, { mapId: 7, characterCount: 2 }, { mapId: 6, characterCount: 2 }])).toBe(7);
  });

  it('picks nothing without characters on the maps', () => {
    expect(masterDefaultMap([{ mapId: 5, characterCount: 0 }])).toBeNull();
    expect(masterDefaultMap([])).toBeNull();
  });
});
