import { describe, expect, it } from 'vitest';
import type { CampaignCharacterInfo } from '../types/campaignCharacter';
import type { MapTokenInfo } from '../types/mapToken';
import { MAP_TOKEN_TYPE } from '../types/mapToken';
import { gridPixelSize, hexCenter, HEX_SIZE } from './hexGrid';
import { candidateAt, focusCandidates, focusCenter, initialFocus, ownCandidate, resolveFocus } from './isoFocus';

const member = (campaignCharacterId: number, characterId: number, characterName: string) =>
  ({ campaignCharacterId, characterId, characterName } as CampaignCharacterInfo);

const piece = (mapTokenId: number, campaignCharacterId: number | null, x: number, y: number, mapId = 1,
  tokenType: number = MAP_TOKEN_TYPE.character, space = 1) =>
  ({ mapTokenId, campaignCharacterId, x, y, mapId, tokenType, look: 3, space } as unknown as MapTokenInfo);

const party = [member(10, 100, 'Aria'), member(20, 200, 'Borin'), member(30, 300, 'Cedric')];

describe('isoFocus', () => {
  it('lists the party characters with a piece on the open map, in the panel order', () => {
    const tokens = [piece(3, 30, 4, 4), piece(1, 10, 1, 1), piece(9, 20, 2, 2, 2), piece(5, null, 0, 0, 1, MAP_TOKEN_TYPE.object)];
    const candidates = focusCandidates(party, tokens, 1);

    expect(candidates.map((c) => c.name)).toEqual(['Aria', 'Cedric']);
    expect(candidates[1].center).toEqual(hexCenter(4, 4, HEX_SIZE));
    expect(focusCandidates(party, tokens, null)).toEqual([]);
  });

  it('starts on the own character, else on the first of the party', () => {
    const candidates = focusCandidates(party, [piece(1, 10, 1, 1), piece(2, 20, 2, 2)], 1);

    expect(initialFocus(candidates, 200)).toBe(20);
    expect(ownCandidate(candidates, 200)?.name).toBe('Borin');
    // The master (no character) and a player without a piece start on the first character of the panel.
    expect(initialFocus(candidates, null)).toBe(10);
    expect(initialFocus(candidates, 300)).toBe(10);
    expect(initialFocus([], 100)).toBeNull();
  });

  it('keeps the focus while it has a piece, and goes back to the initial one otherwise', () => {
    const both = focusCandidates(party, [piece(1, 10, 1, 1), piece(2, 20, 2, 2)], 1);
    const onlyAria = focusCandidates(party, [piece(1, 10, 1, 1)], 1);

    expect(resolveFocus(20, both, 100)).toBe(20);
    expect(resolveFocus(20, onlyAria, 100)).toBe(10);
    expect(resolveFocus(null, both, 200)).toBe(20);
  });

  it('puts the light in the middle of the grid without a focus', () => {
    const candidates = focusCandidates(party, [piece(1, 10, 3, 2)], 1);
    const { width, height } = gridPixelSize(20, 10, HEX_SIZE);

    expect(focusCenter(10, candidates, 20, 10)).toEqual(hexCenter(3, 2, HEX_SIZE));
    expect(focusCenter(null, candidates, 20, 10)).toEqual({ x: width / 2, y: height / 2 });
  });

  it('finds the character whose piece covers a clicked hex', () => {
    const tokens = [piece(1, 10, 1, 1), piece(2, 20, 6, 6, 1, MAP_TOKEN_TYPE.character, 7)];
    const candidates = focusCandidates(party, tokens, 1);

    expect(candidateAt({ x: 1, y: 1 }, tokens, candidates)?.name).toBe('Aria');
    // A 7-hex piece covers its neighbours too.
    expect(candidateAt({ x: 6, y: 5 }, tokens, candidates)?.name).toBe('Borin');
    expect(candidateAt({ x: 12, y: 12 }, tokens, candidates)).toBeNull();
  });
});
