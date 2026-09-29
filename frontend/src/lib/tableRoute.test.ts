import { describe, expect, it } from 'vitest';
import { isTablePath, parseTablePath, tablePathFor } from './tableRoute';

describe('parseTablePath', () => {
  it('reads campaign and map slugs, with or without a trailing slash', () => {
    expect(parseTablePath('/campaign/tormento-vil')).toEqual({ kind: 'campaign', slug: 'tormento-vil' });
    expect(parseTablePath('/campaign/tormento-vil/')).toEqual({ kind: 'campaign', slug: 'tormento-vil' });
    expect(parseTablePath('/map/estrada-1')).toEqual({ kind: 'map', slug: 'estrada-1' });
    expect(parseTablePath('/map/estrada-1/')).toEqual({ kind: 'map', slug: 'estrada-1' });
  });

  it('decodes the slug', () => {
    expect(parseTablePath('/campaign/a%C3%A7%C3%A3o')).toEqual({ kind: 'campaign', slug: 'ação' });
    expect(parseTablePath('/map/a%20b')).toEqual({ kind: 'map', slug: 'a b' });
  });

  it('treats every other path as the root', () => {
    expect(parseTablePath('/')).toEqual({ kind: 'root', slug: null });
    expect(parseTablePath('/login')).toEqual({ kind: 'root', slug: null });
    expect(parseTablePath('/campaign')).toEqual({ kind: 'root', slug: null });
    expect(parseTablePath('/campaign/a/b')).toEqual({ kind: 'root', slug: null });
    expect(parseTablePath('/maps/estrada-1')).toEqual({ kind: 'root', slug: null });
  });
});

describe('isTablePath', () => {
  it('is true only for campaign and map addresses', () => {
    expect(isTablePath('/campaign/tormento-vil')).toBe(true);
    expect(isTablePath('/map/estrada-1')).toBe(true);
    expect(isTablePath('/')).toBe(false);
    expect(isTablePath('/login')).toBe(false);
  });
});

describe('tablePathFor', () => {
  it('prefers the campaign map of the current campaign', () => {
    expect(tablePathFor({
      campaignSlug: 'tormento-vil', mapSlug: 'estrada-1', mapCampaignId: 3, campaignId: 3,
    })).toBe('/map/estrada-1');
  });

  it('uses the campaign when no map of it is open', () => {
    expect(tablePathFor({
      campaignSlug: 'tormento-vil', mapSlug: null, mapCampaignId: null, campaignId: 3,
    })).toBe('/campaign/tormento-vil');
    expect(tablePathFor({
      campaignSlug: 'tormento-vil', mapSlug: 'outro', mapCampaignId: 9, campaignId: 3,
    })).toBe('/campaign/tormento-vil');
  });

  it('is the root without a campaign', () => {
    expect(tablePathFor({
      campaignSlug: null, mapSlug: 'estrada-1', mapCampaignId: 3, campaignId: null,
    })).toBe('/');
  });
});
