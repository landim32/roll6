import { describe, expect, it } from 'vitest';
import { affectsMap, applyTokenEvent } from './realtimeEvents';
import { TABLE_EVENT } from '../types/realtime';
import type { TableEvent, TableEventType } from '../types/realtime';
import { MAP_TOKEN_TYPE } from '../types/mapToken';
import type { MapTokenInfo } from '../types/mapToken';

const piece = (mapTokenId: number, x: number, y: number, mapId = 30): MapTokenInfo => ({
  mapTokenId, mapId, tokenId: 5, tokenName: 'T', upImageUrl: null, downImageUrl: null,
  campaignCharacterId: null, characterId: null, mapNpcId: null, npcId: null, name: `P${mapTokenId}`,
  tokenType: MAP_TOKEN_TYPE.object, sheet: null, life: 0, energy: 0, status: null, move: 0,
  x, y, look: 0, createdAt: '', updatedAt: '',
});

const event = (type: TableEventType, mapId: number | null, data: unknown = null): TableEvent =>
  ({ type, campaignId: 10, mapId, actorUserId: 1, data });

describe('applyTokenEvent', () => {
  const tokens = [piece(1, 0, 0), piece(2, 1, 1)];

  it('replaces a moved piece in place', () => {
    const next = applyTokenEvent(tokens, event(TABLE_EVENT.mapTokenUpserted, 30, piece(2, 4, 5)), 30);
    expect(next.map((t) => [t.mapTokenId, t.x, t.y])).toEqual([[1, 0, 0], [2, 4, 5]]);
  });

  it('adds a new piece and applying it twice keeps one copy', () => {
    const once = applyTokenEvent(tokens, event(TABLE_EVENT.mapTokenUpserted, 30, piece(3, 2, 2)), 30);
    const twice = applyTokenEvent(once, event(TABLE_EVENT.mapTokenUpserted, 30, piece(3, 2, 2)), 30);
    expect(twice.map((t) => t.mapTokenId)).toEqual([1, 2, 3]);
  });

  it('removes a deleted piece', () => {
    expect(applyTokenEvent(tokens, event(TABLE_EVENT.mapTokenDeleted, 30, { mapTokenId: 1 }), 30).map((t) => t.mapTokenId))
      .toEqual([2]);
  });

  it('ignores other maps, no open map and other events', () => {
    expect(applyTokenEvent(tokens, event(TABLE_EVENT.mapTokenUpserted, 31, piece(9, 0, 0, 31)), 30)).toBe(tokens);
    expect(applyTokenEvent(tokens, event(TABLE_EVENT.mapTokenDeleted, 30, { mapTokenId: 1 }), null)).toBe(tokens);
    expect(applyTokenEvent(tokens, event(TABLE_EVENT.turnChanged, 30), 30)).toBe(tokens);
  });
});

describe('affectsMap', () => {
  it('matches the open map or every map', () => {
    expect(affectsMap(event(TABLE_EVENT.mapTokensChanged, 30), 30)).toBe(true);
    expect(affectsMap(event(TABLE_EVENT.mapTokensChanged, null), 30)).toBe(true);
    expect(affectsMap(event(TABLE_EVENT.mapTokensChanged, 31), 30)).toBe(false);
    expect(affectsMap(event(TABLE_EVENT.mapTokensChanged, null), null)).toBe(false);
  });
});
