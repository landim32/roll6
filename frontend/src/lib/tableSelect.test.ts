import { describe, expect, it } from 'vitest';
import { tableEntries, triggerLabels } from './tableSelect';
import type { CampaignTableInfo } from '../types/campaign';

const campaigns: CampaignTableInfo[] = [
  {
    campaignId: 3, name: 'Tormento Vil', slug: 'tormento-vil', isMaster: true,
    currentMapId: 12, currentMapName: 'Estrada 1', currentMapSlug: 'estrada-1',
  },
  {
    campaignId: 9, name: 'Teste 2', slug: 'teste-2', isMaster: false,
    currentMapId: null, currentMapName: null, currentMapSlug: null,
  },
];

describe('tableEntries', () => {
  it('builds a map line and a campaign line, and marks what is open', () => {
    const entries = tableEntries(campaigns, { campaignId: 3, mapId: 12 });

    expect(entries[0]).toEqual({
      key: '3',
      mapLabel: 'Estrada 1',
      mapPath: '/map/estrada-1',
      campaignLabel: 'Tormento Vil',
      campaignPath: '/campaign/tormento-vil',
      mapActive: true,
      campaignActive: true,
    });
    expect(entries[1]).toEqual({
      key: '9',
      mapLabel: null,
      mapPath: '/campaign/teste-2',
      campaignLabel: 'Teste 2',
      campaignPath: '/campaign/teste-2',
      mapActive: false,
      campaignActive: false,
    });
  });

  it('does not mark the map line when another map of the campaign is open', () => {
    const [entry] = tableEntries(campaigns, { campaignId: 3, mapId: 99 });
    expect(entry.mapActive).toBe(false);
    expect(entry.campaignActive).toBe(true);
  });
});

describe('triggerLabels', () => {
  it('keeps the open map name and the campaign name', () => {
    expect(triggerLabels('Estrada 1', 'Tormento Vil')).toEqual({ map: 'Estrada 1', campaign: 'Tormento Vil' });
    expect(triggerLabels('  ', null)).toEqual({ map: '', campaign: null });
  });
});
