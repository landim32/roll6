import { describe, expect, it } from 'vitest';
import { showsInTable, tableEntries, triggerLabels } from './tableSelect';
import type { CampaignTableInfo } from '../types/campaign';

const campaign = (over: Partial<CampaignTableInfo>): CampaignTableInfo => ({
  campaignId: 3, name: 'Tormento Vil', slug: 'tormento-vil', status: 2, freeMode: false, isMaster: true,
  currentMapId: null, currentMapName: null, currentMapSlug: null, maps: [], ...over,
});

const mastered = campaign({
  currentMapId: 12, currentMapName: 'Estrada 1', currentMapSlug: 'estrada-1',
  maps: [
    { mapId: 12, name: 'Estrada 1', slug: 'estrada-1', status: 4 },
    { mapId: 13, name: 'Taberna 1', slug: 'taberna-1', status: 1 },
  ],
});

describe('078: tableEntries', () => {
  it('gives the master every playable map, the current one first and marked, opening each', () => {
    const [entry] = tableEntries([mastered], { campaignId: 3, mapId: 13 });

    expect(entry.isMaster).toBe(true);
    expect(entry.campaignPath).toBe('/campaign/tormento-vil');
    expect(entry.campaignActive).toBe(true);
    expect(entry.maps).toEqual([
      { key: '3:12', label: 'Estrada 1', path: '/map/estrada-1', isCurrent: true, active: false },
      { key: '3:13', label: 'Taberna 1', path: '/map/taberna-1', isCurrent: false, active: true },
    ]);
  });

  it('gives a player only the current map of the campaign', () => {
    const played = campaign({
      campaignId: 9, name: 'Outra', slug: 'outra', isMaster: false,
      currentMapId: 40, currentMapName: 'Porto 1', currentMapSlug: 'porto-1',
    });
    const [entry] = tableEntries([played], { campaignId: null, mapId: null });

    expect(entry.maps).toEqual([{ key: '9:40', label: 'Porto 1', path: '/map/porto-1', isCurrent: true, active: false }]);
    expect(tableEntries([{ ...played, currentMapId: null, currentMapSlug: null }], { campaignId: null, mapId: null })[0].maps).toEqual([]);
  });

  it('never gives a player other maps, even if a list came along', () => {
    const played = campaign({
      isMaster: false, currentMapId: 12, currentMapName: 'Estrada 1', currentMapSlug: 'estrada-1', maps: mastered.maps,
    });
    expect(tableEntries([played], { campaignId: null, mapId: null })[0].maps.map((m) => m.label)).toEqual(['Estrada 1']);
  });

  it('shows the master his preparing and active campaigns, a player only active ones', () => {
    expect(showsInTable({ isMaster: true, status: 1 })).toBe(true);
    expect(showsInTable({ isMaster: true, status: 2 })).toBe(true);
    expect(showsInTable({ isMaster: true, status: 3 })).toBe(false);
    expect(showsInTable({ isMaster: true, status: 4 })).toBe(false);
    expect(showsInTable({ isMaster: false, status: 2 })).toBe(true);
    expect(showsInTable({ isMaster: false, status: 1 })).toBe(false);
    expect(showsInTable({ isMaster: false, status: 3 })).toBe(false);
  });

  it('follows the role in each campaign for a user who masters one and plays in another', () => {
    const entries = tableEntries([
      mastered,
      campaign({ campaignId: 9, name: 'Outra', slug: 'outra', isMaster: false, currentMapId: 40, currentMapName: 'Porto 1', currentMapSlug: 'porto-1' }),
      campaign({ campaignId: 7, name: 'Pausada', slug: 'pausada', status: 3 }),
    ], { campaignId: null, mapId: null });

    expect(entries.map((e) => [e.key, e.isMaster, e.maps.length])).toEqual([['3', true, 2], ['9', false, 1]]);
  });
});

describe('triggerLabels', () => {
  it('keeps the open map name and the campaign name', () => {
    expect(triggerLabels('Estrada 1', 'Tormento Vil')).toEqual({ map: 'Estrada 1', campaign: 'Tormento Vil' });
    expect(triggerLabels('  ', null)).toEqual({ map: '', campaign: null });
  });
});
