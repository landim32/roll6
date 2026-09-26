import { describe, expect, it } from 'vitest';
import { characterDropAction, npcDropAction, tokenAt, tokenOfParticipation } from './mapTokens';
import type { CampaignCharacterInfo } from '../types/campaignCharacter';
import { MAP_TOKEN_TYPE } from '../types/mapToken';
import type { MapTokenInfo } from '../types/mapToken';

const piece = (mapTokenId: number, x: number, y: number, campaignCharacterId: number | null = null): MapTokenInfo => ({
  mapTokenId, mapId: 1, tokenId: 1, tokenName: '', upImageUrl: null, downImageUrl: null,
  campaignCharacterId, characterId: null, mapNpcId: null, npcId: null, name: '', tokenType: campaignCharacterId ? MAP_TOKEN_TYPE.character : MAP_TOKEN_TYPE.npc,
  sheet: null, life: 0, energy: 0, status: null, move: 0, x, y, look: 0, createdAt: '', updatedAt: '',
});

const member = (campaignCharacterId: number, characterTokenId: number | null) =>
  ({ campaignCharacterId, characterTokenId } as CampaignCharacterInfo);

const tokens = [piece(10, 1, 1), piece(11, 2, 2, 7)];

describe('helpers', () => {
  it('finds pieces by cell and by participation', () => {
    expect(tokenAt(tokens, 1, 1)?.mapTokenId).toBe(10);
    expect(tokenAt(tokens, 0, 0)).toBeUndefined();
    expect(tokenOfParticipation(tokens, 7)?.mapTokenId).toBe(11);
    expect(tokenOfParticipation(tokens, 8)).toBeUndefined();
  });
});

describe('characterDropAction', () => {
  it('does nothing outside the grid or on its own hex', () => {
    expect(characterDropAction({ hex: null, tokens, participation: member(7, 3) })).toEqual({ kind: 'none' });
    expect(characterDropAction({ hex: { x: 2, y: 2 }, tokens, participation: member(7, 3) })).toEqual({ kind: 'none' });
  });

  it('warns on a hex taken by another piece', () => {
    expect(characterDropAction({ hex: { x: 1, y: 1 }, tokens, participation: member(7, 3) })).toEqual({ kind: 'occupied' });
    expect(characterDropAction({ hex: { x: 2, y: 2 }, tokens, participation: member(8, 3) })).toEqual({ kind: 'occupied' });
  });

  it('moves a character already on the map', () => {
    expect(characterDropAction({ hex: { x: 0, y: 0 }, tokens, participation: member(7, 3) })).toEqual({ kind: 'move', mapTokenId: 11 });
  });

  it('places a character with a token and asks for one otherwise', () => {
    expect(characterDropAction({ hex: { x: 0, y: 0 }, tokens, participation: member(8, 3) })).toEqual({ kind: 'place' });
    expect(characterDropAction({ hex: { x: 0, y: 0 }, tokens, participation: member(8, null) })).toEqual({ kind: 'chooseToken' });
  });
});

describe('npcDropAction', () => {
  it('does nothing outside the grid, warns on a taken hex and places otherwise', () => {
    expect(npcDropAction({ hex: null, tokens })).toEqual({ kind: 'none' });
    expect(npcDropAction({ hex: { x: 1, y: 1 }, tokens })).toEqual({ kind: 'occupied' });
    expect(npcDropAction({ hex: { x: 0, y: 0 }, tokens })).toEqual({ kind: 'place' });
  });
});
