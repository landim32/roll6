import { describe, expect, it } from 'vitest';
import { CAMPAIGN_STATUS } from './campaignStatus';
import { isFreeMode, movementKindFor, showPending, showTrails } from './freeMode';
import { MOVEMENT_KIND } from './movement';
import { MAP_TOKEN_TYPE } from '../types/mapToken';

describe('isFreeMode', () => {
  it('is false without a campaign or a flag', () => {
    expect(isFreeMode(null)).toBe(false);
    expect(isFreeMode(undefined)).toBe(false);
    expect(isFreeMode({})).toBe(false);
    expect(isFreeMode({ freeMode: false })).toBe(false);
  });

  it('is true only when the campaign says so', () => {
    expect(isFreeMode({ freeMode: true })).toBe(true);
  });
});

describe('showPending', () => {
  it('needs an active campaign with the notice on, free mode or not', () => {
    expect(showPending({ status: CAMPAIGN_STATUS.active })).toBe(true);
    expect(showPending({ status: CAMPAIGN_STATUS.active, pendingNotice: true })).toBe(true);
    expect(showPending({ status: CAMPAIGN_STATUS.active, pendingNotice: true, freeMode: true } as never)).toBe(true);
    expect(showPending({ status: CAMPAIGN_STATUS.active, pendingNotice: false })).toBe(false);
    expect(showPending({ status: CAMPAIGN_STATUS.paused, pendingNotice: true })).toBe(false);
    expect(showPending(null)).toBe(false);
  });
});

describe('showTrails', () => {
  it('hides the trails while free', () => {
    expect(showTrails(false)).toBe(true);
    expect(showTrails(true)).toBe(false);
  });
});

describe('movementKindFor', () => {
  it('keeps objects free in both modes', () => {
    expect(movementKindFor(MAP_TOKEN_TYPE.object, false)).toBe(MOVEMENT_KIND.free);
    expect(movementKindFor(MAP_TOKEN_TYPE.object, true)).toBe(MOVEMENT_KIND.free);
  });

  it('makes characters and NPCs unlimited only in free mode', () => {
    expect(movementKindFor(MAP_TOKEN_TYPE.character, true)).toBe(MOVEMENT_KIND.unlimited);
    expect(movementKindFor(MAP_TOKEN_TYPE.npc, true)).toBe(MOVEMENT_KIND.unlimited);
    expect(movementKindFor(MAP_TOKEN_TYPE.character, false)).toBe(MOVEMENT_KIND.limited);
    expect(movementKindFor(MAP_TOKEN_TYPE.npc, false)).toBe(MOVEMENT_KIND.limited);
  });
});
