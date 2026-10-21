import { describe, expect, it } from 'vitest';
import { pickTarget, pieceCovering, submitsOnEnter, targetLabel, targetTitle, toTargetWrite } from './actionTarget';
import { MAP_TOKEN_TYPE } from '../types/mapToken';
import type { MapTokenInfo } from '../types/mapToken';
import type { TurnTargetInfo } from '../types/turn';

const piece = (over: Partial<MapTokenInfo>): MapTokenInfo => ({
  mapTokenId: 1, mapId: 30, tokenId: 5, campaignCharacterId: null, characterId: null, mapNpcId: null, npcId: null,
  name: 'Peça', tokenType: MAP_TOKEN_TYPE.object, x: 0, y: 0, look: 3, space: 1, posture: null,
  ...over,
} as MapTokenInfo);

const aria = piece({ mapTokenId: 42, name: 'Aria', tokenType: MAP_TOKEN_TYPE.character, characterId: 80, x: 4, y: 4 });
const goblin = piece({ mapTokenId: 43, name: 'Goblin', tokenType: MAP_TOKEN_TYPE.npc, mapNpcId: 90, npcCategory: 1, x: 6, y: 6 });
const wolf = piece({ mapTokenId: 44, name: 'Lobo', tokenType: MAP_TOKEN_TYPE.npc, mapNpcId: 91, npcCategory: 3, x: 2, y: 2, space: 2, look: 0 });
const chest = piece({ mapTokenId: 45, name: 'Baú', x: 7, y: 7 });

describe('pickTarget', () => {
  const pieces = [aria, goblin, wolf, chest];

  it('names the piece on the hex with its kind and side', () => {
    expect(pickTarget({ x: 6, y: 6 }, aria, pieces).piece).toEqual({ mapTokenId: 43, name: 'Goblin', kind: 'npc', side: 'enemy' });
    expect(pickTarget({ x: 7, y: 7 }, aria, pieces).piece).toEqual({ mapTokenId: 45, name: 'Baú', kind: 'object', side: 'object' });
    expect(pickTarget({ x: 4, y: 4 }, aria, pieces).piece?.side).toBe('self');
    expect(pickTarget({ x: 6, y: 6 }, goblin, pieces).piece?.side).toBe('self');
    expect(pickTarget({ x: 4, y: 4 }, goblin, pieces).piece?.side).toBe('ally');
  });

  it('sees the whole shape of a big piece and the ally category', () => {
    // The wolf takes 2 hexes: its own and the one behind it (look 0 → behind is below).
    expect(pickTarget({ x: 2, y: 3 }, aria, pieces).piece).toEqual({ mapTokenId: 44, name: 'Lobo', kind: 'npc', side: 'ally' });
  });

  it('is an empty hex when nothing covers it', () => {
    expect(pickTarget({ x: 9, y: 9 }, aria, pieces)).toEqual({ x: 9, y: 9, piece: null });
  });

  it('takes the piece drawn on top when several share the hex', () => {
    const lying = piece({ mapTokenId: 46, name: 'Goblin 2', tokenType: MAP_TOKEN_TYPE.npc, mapNpcId: 92, x: 6, y: 6 });
    expect(pieceCovering({ x: 6, y: 6 }, [goblin, lying])?.mapTokenId).toBe(46);
  });
});

describe('titles and writes', () => {
  it('targetTitle', () => {
    expect(targetTitle({ x: 9, y: 7, piece: null })).toBe('o hex (9, 7)');
    expect(targetTitle({ x: 4, y: 4, piece: { mapTokenId: 42, name: 'Aria', kind: 'character', side: 'self' } })).toBe('si mesmo');
    expect(targetTitle({ x: 6, y: 6, piece: { mapTokenId: 43, name: 'Goblin', kind: 'npc', side: 'enemy' } })).toBe('Goblin');
  });

  it('toTargetWrite', () => {
    expect(toTargetWrite({ x: 9, y: 7, piece: null })).toEqual({ x: 9, y: 7, mapTokenId: null });
    expect(toTargetWrite({ x: 6, y: 6, piece: { mapTokenId: 43, name: 'Goblin', kind: 'npc', side: 'enemy' } })).toEqual({ x: 6, y: 6, mapTokenId: 43 });
  });
});

describe('targetLabel', () => {
  const base: TurnTargetInfo = {
    x: 9, y: 7, distance: 3, mapTokenId: 43, kind: 'npc', kindLabel: 'NPC', side: 'enemy', sideLabel: 'inimigo', name: 'Goblin 2',
    characterId: null, mapNpcId: 92, look: 2, lookName: 'Sudeste', posture: 1, postureLabel: 'Em pé', status: null,
    currentLife: 5, totalLife: 12, currentEnergy: 3, totalEnergy: 10, text: '…',
  };

  it('piece, empty hex, self and the singular', () => {
    expect(targetLabel(base)).toBe('Goblin 2 (inimigo, NPC) · (9, 7) · 3 hexes');
    expect(targetLabel({ ...base, distance: 1 })).toBe('Goblin 2 (inimigo, NPC) · (9, 7) · 1 hex');
    expect(targetLabel({ ...base, mapTokenId: null, x: 12, y: 4, distance: 5 })).toBe('o hex (12, 4) · 5 hexes');
    expect(targetLabel({ ...base, side: 'self', x: 4, y: 4, distance: 0 })).toBe('si mesmo · (4, 4)');
  });
});

describe('submitsOnEnter', () => {
  it('Enter alone sends; Shift+Enter and IME composition do not', () => {
    expect(submitsOnEnter('Enter', false, false)).toBe(true);
    expect(submitsOnEnter('Enter', true, false)).toBe(false);
    expect(submitsOnEnter('Enter', false, true)).toBe(false);
    expect(submitsOnEnter('a', false, false)).toBe(false);
  });
});
