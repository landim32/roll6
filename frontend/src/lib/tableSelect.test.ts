import { describe, expect, it } from 'vitest';
import { playerMaps, showsInTable, tableEntries, triggerLabels } from './tableSelect';
import type { CampaignTableInfo, TableMapInfo } from '../types/campaign';

const campaign = (over: Partial<CampaignTableInfo>): CampaignTableInfo => ({
  campaignId: 3, name: 'Tormento Vil', slug: 'tormento-vil', status: 2, freeMode: false, isMaster: true, maps: [], ...over,
});

const map = (mapId: number, name: string, slug: string, characterIds: number[] = []): TableMapInfo => ({
  mapId, name, slug, status: 1, characterCount: characterIds.length, characterIds,
});

const mastered = campaign({ maps: [map(12, 'Estrada 1', 'estrada-1', [1, 2]), map(13, 'Taberna 1', 'taberna-1')] });

describe('078: tableEntries', () => {
  it('gives the master every active map, opening each, whatever characters are there', () => {
    const [entry] = tableEntries([mastered], { campaignId: 3, mapId: 13 });

    expect(entry.isMaster).toBe(true);
    expect(entry.campaignPath).toBe('/campaign/tormento-vil');
    expect(entry.campaignActive).toBe(true);
    expect(entry.maps).toEqual([
      { key: '3:12', label: 'Estrada 1', path: '/map/estrada-1', active: false },
      { key: '3:13', label: 'Taberna 1', path: '/map/taberna-1', active: true },
    ]);
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
      campaign({ campaignId: 9, name: 'Outra', slug: 'outra', isMaster: false, maps: [map(40, 'Porto 1', 'porto-1', [7])] }),
      campaign({ campaignId: 7, name: 'Pausada', slug: 'pausada', status: 3 }),
    ], { campaignId: null, mapId: null });

    expect(entries.map((e) => [e.key, e.isMaster, e.maps.length])).toEqual([['3', true, 2], ['9', false, 1]]);
  });
});

describe('108: the map of the player\'s character', () => {
  const played = campaign({
    campaignId: 9, name: 'Outra', slug: 'outra', isMaster: false,
    maps: [map(40, 'Porto 1', 'porto-1', [7]), map(41, 'Mina 1', 'mina-1', [8])],
  });

  it('gives a player only the map of the chosen character', () => {
    const [entry] = tableEntries([played], { campaignId: null, mapId: null }, { 9: 8 });
    expect(entry.maps).toEqual([{ key: '9:41', label: 'Mina 1', path: '/map/mina-1', active: false }]);
  });

  it('offers no map when the chosen character is off every map', () => {
    expect(tableEntries([played], { campaignId: null, mapId: null }, { 9: 99 })[0].maps).toEqual([]);
    expect(tableEntries([{ ...played, maps: [] }], { campaignId: null, mapId: null })[0].maps).toEqual([]);
  });

  it('keeps the maps of his characters while nothing was chosen in that campaign', () => {
    expect(playerMaps(played, {}).map((m) => m.mapId)).toEqual([40, 41]);
    expect(playerMaps(played, { 5: 8 }).map((m) => m.mapId)).toEqual([40, 41]);
  });

  it('never narrows the master by his own choice', () => {
    expect(tableEntries([mastered], { campaignId: null, mapId: null }, { 3: 99 })[0].maps).toHaveLength(2);
  });
});

describe('triggerLabels', () => {
  it('keeps the open map name and the campaign name', () => {
    expect(triggerLabels('Estrada 1', 'Tormento Vil')).toEqual({ map: 'Estrada 1', campaign: 'Tormento Vil' });
    expect(triggerLabels('  ', null)).toEqual({ map: '', campaign: null });
  });
});
