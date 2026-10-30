import { describe, expect, it } from 'vitest';
import { canMove, canSetPosture, canTakeTurn, isOwnPiece, menuAllowed, shapeAt } from './mapInteraction';
import type { MapInteractionContext } from './mapInteraction';
import { CAMPAIGN_STATUS } from './campaignStatus';
import { MAP_TOKEN_TYPE } from '../types/mapToken';
import type { MapTokenInfo } from '../types/mapToken';
import type { CampaignCharacterInfo } from '../types/campaignCharacter';
import { TURN_TYPE } from '../types/turn';
import type { TurnInfo } from '../types/turn';

const piece = (over: Partial<MapTokenInfo>): MapTokenInfo => ({
  mapTokenId: 1, mapId: 30, tokenId: 5, campaignCharacterId: null, characterId: null, mapNpcId: null, npcId: null,
  name: 'Peça', tokenType: MAP_TOKEN_TYPE.object, x: 0, y: 0, look: 3, space: 1, posture: null, commanderUserId: null,
  ...over,
} as MapTokenInfo);

const PLAYER = 7;
const ARIA = piece({ mapTokenId: 1, tokenType: MAP_TOKEN_TYPE.character, campaignCharacterId: 11, characterId: 80 });
const BORIN = piece({ mapTokenId: 2, tokenType: MAP_TOKEN_TYPE.character, campaignCharacterId: 12, characterId: 81, x: 3 });
const GOBLIN = piece({ mapTokenId: 3, tokenType: MAP_TOKEN_TYPE.npc, mapNpcId: 90, npcId: 8, x: 5 });
const WOLF = piece({ mapTokenId: 4, tokenType: MAP_TOKEN_TYPE.npc, mapNpcId: 91, npcId: 9, x: 6, commanderUserId: PLAYER });
const CHEST = piece({ mapTokenId: 5, tokenType: MAP_TOKEN_TYPE.object, x: 7 });

const party = [
  { campaignCharacterId: 11, characterId: 80, characterOwnerId: PLAYER },
  { campaignCharacterId: 12, characterId: 81, characterOwnerId: 99 },
] as CampaignCharacterInfo[];

const moved = (characterId: number): TurnInfo => ({
  turnId: 1, campaignId: 10, mapId: 30, turnNo: 3, turnType: TURN_TYPE.movement, characterId, npcId: null, mapNpcId: null,
  actorName: '', beforeX: 0, beforeY: 0, beforeLook: 0, x: 1, y: 0, look: 0, description: null, userId: PLAYER,
  userName: '', moved: 1, changes: null, createdAt: '2026-10-30T00:00:00',
} as TurnInfo);

const player = (over: Partial<MapInteractionContext> = {}): MapInteractionContext => ({
  mapId: 30, canPlace: false, canPlaceOwn: true, freeMode: false, turnNo: 3, campaignStatus: CAMPAIGN_STATUS.active,
  turnEntries: [], party, userId: PLAYER, ...over,
});
const master = (over: Partial<MapInteractionContext> = {}) => player({ canPlace: true, userId: 1, ...over });

describe('isOwnPiece', () => {
  it('is the player’s own character or the ally he commands, never someone else’s', () => {
    expect(isOwnPiece(ARIA, player())).toBe(true);
    expect(isOwnPiece(WOLF, player())).toBe(true);
    expect(isOwnPiece(BORIN, player())).toBe(false);
    expect(isOwnPiece(GOBLIN, player())).toBe(false);
  });
});

describe('canMove', () => {
  it('lets the master move any piece and a player only his own', () => {
    for (const token of [ARIA, BORIN, GOBLIN, CHEST]) expect(canMove(token, master())).toBe(true);
    expect(canMove(ARIA, player())).toBe(true);
    expect(canMove(WOLF, player())).toBe(true);
    expect(canMove(BORIN, player())).toBe(false);
    expect(canMove(CHEST, player())).toBe(false);
  });

  it('allows one move per turn, except objects and free mode', () => {
    const entries = [moved(80)];
    expect(canMove(ARIA, player({ turnEntries: entries }))).toBe(false);
    expect(canMove(ARIA, player({ turnEntries: entries, freeMode: true }))).toBe(true);
    expect(canMove(CHEST, master({ turnEntries: [moved(80)] }))).toBe(true);
  });

  it('needs an open campaign map that may be edited', () => {
    expect(canMove(ARIA, player({ mapId: null }))).toBe(false);
    expect(canMove(ARIA, player({ canPlaceOwn: false }))).toBe(false);
  });
});

describe('canTakeTurn', () => {
  it('never for objects nor while the campaign does not play', () => {
    expect(canTakeTurn(CHEST, master())).toBe(false);
    expect(canTakeTurn(ARIA, master({ campaignStatus: CAMPAIGN_STATUS.paused }))).toBe(false);
    expect(canTakeTurn(ARIA, master({ turnNo: null }))).toBe(false);
  });

  it('the master on characters and NPCs, a player on his own and commanded allies', () => {
    expect(canTakeTurn(GOBLIN, master())).toBe(true);
    expect(canTakeTurn(ARIA, player())).toBe(true);
    expect(canTakeTurn(WOLF, player())).toBe(true);
    expect(canTakeTurn(GOBLIN, player())).toBe(false);
  });
});

describe('canSetPosture', () => {
  it('follows the same owners and never objects', () => {
    expect(canSetPosture(CHEST, master())).toBe(false);
    expect(canSetPosture(BORIN, master())).toBe(true);
    expect(canSetPosture(ARIA, player())).toBe(true);
    expect(canSetPosture(BORIN, player())).toBe(false);
  });
});

describe('menuAllowed', () => {
  it('opens for the master everywhere, for a player only on pieces he may use', () => {
    expect(menuAllowed(undefined, master())).toBe(true);
    expect(menuAllowed(undefined, player())).toBe(false);
    expect(menuAllowed(BORIN, player())).toBe(false);
    expect(menuAllowed(ARIA, player())).toBe(true);
  });

  it('keeps the menu of a moved character for its posture and action', () => {
    expect(menuAllowed(ARIA, player({ turnEntries: [moved(80)] }))).toBe(true);
  });
});

describe('shapeAt', () => {
  it('is the hex alone when empty and the whole shape of a piece on it (031)', () => {
    expect(shapeAt(null, [])).toBeNull();
    expect(shapeAt({ x: 2, y: 2 }, [ARIA])).toEqual({ hexes: [{ x: 2, y: 2 }], pieceId: null });
    const big = piece({ mapTokenId: 9, tokenType: MAP_TOKEN_TYPE.npc, x: 4, y: 4, space: 7 });
    const shape = shapeAt({ x: 4, y: 4 }, [big]);
    expect(shape?.pieceId).toBe(9);
    expect(shape?.hexes).toHaveLength(7);
  });
});
