import { describe, expect, it } from 'vitest';
import { isMasterOf, viewerMapDecision, visibleCampaignMaps } from './viewerMap';

const CAMPAIGN = 10;
const A = 1;
const B = 2;

const decide = (over: Partial<Parameters<typeof viewerMapDecision>[0]>) => viewerMapDecision({
  isMaster: false, mapId: B, mapCampaignId: CAMPAIGN, campaignId: CAMPAIGN, currentMapId: A, ...over,
});

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
    expect(decide({ isMaster: true, currentMapId: null })).toEqual({ kind: 'open' });
  });

  it('lets a player open the current map', () => {
    expect(decide({ mapId: A })).toEqual({ kind: 'open' });
  });

  it('sends a player on another map of the campaign to the current one', () => {
    expect(decide({})).toEqual({ kind: 'redirect', mapId: A });
  });

  it('opens nothing for a player when the campaign has no current map', () => {
    expect(decide({ currentMapId: null })).toEqual({ kind: 'none' });
  });

  it('does not apply to a map of another campaign', () => {
    expect(decide({ mapCampaignId: 99 })).toEqual({ kind: 'open' });
  });
});

describe('visibleCampaignMaps', () => {
  const items = [{ mapId: A, name: 'A' }, { mapId: B, name: 'B' }];

  it('shows the master every map', () => {
    expect(visibleCampaignMaps(items, { isMaster: true, currentMapId: A })).toEqual(items);
  });

  it('shows a player only the current map', () => {
    expect(visibleCampaignMaps(items, { isMaster: false, currentMapId: A })).toEqual([items[0]]);
    expect(visibleCampaignMaps(items, { isMaster: false, currentMapId: null })).toEqual([]);
  });
});
