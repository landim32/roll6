import { describe, expect, it } from 'vitest';
import { documentTitle } from './documentTitle';

describe('documentTitle', () => {
  it('names the campaign map and its campaign', () => {
    expect(documentTitle({ mapName: 'Estrada', campaignName: 'A Torre', isCampaignMap: true })).toBe('Estrada — A Torre | Roll6');
  });

  it('names a model opened outside a campaign', () => {
    expect(documentTitle({ mapName: 'Estrada', campaignName: 'A Torre', isCampaignMap: false })).toBe('Estrada | Roll6');
    expect(documentTitle({ mapName: 'Estrada', campaignName: null, isCampaignMap: false })).toBe('Estrada | Roll6');
  });

  it('names the campaign alone', () => {
    expect(documentTitle({ mapName: null, campaignName: 'A Torre', isCampaignMap: false })).toBe('A Torre | Roll6');
  });

  it('falls back to the site name', () => {
    expect(documentTitle({ mapName: null, campaignName: null, isCampaignMap: false })).toBe('Roll6');
    expect(documentTitle({ mapName: '  ', campaignName: '', isCampaignMap: true })).toBe('Roll6');
  });
});
