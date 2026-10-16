import { describe, expect, it } from 'vitest';
import { afterAddAction, commandsNpc, groupNpcs, isAllyPiece, onMap, toCategory } from './npcCategory';
import { MAP_TOKEN_TYPE } from '../types/mapToken';
import { NPC_CATEGORY } from '../types/npc';
import type { CampaignNpcInfo, NpcCategory } from '../types/npc';

const npc = (id: number, category: NpcCategory, master: number | null = null): CampaignNpcInfo => ({
  campaignNpcId: id, campaignId: 1, npcId: id, name: `NPC ${id}`, tokenId: 1, tokenImageUrl: null, imageUrl: null,
  life: 5, energy: 5, move: 5, mapNpcCount: 0, category, masterCampaignCharacterId: master, masterCharacterId: master ? master + 100 : null,
  createdAt: '',
});

// A piece of an NPC on a map (076); characters and objects carry no npcId.
const piece = (npcId: number | null, mapId: number, tokenType: number = MAP_TOKEN_TYPE.npc) => ({ tokenType, mapId, npcId });

describe('onMap (076)', () => {
  it('keeps only the enemies and neutrals with a piece on the open map: the reported 20 → 8', () => {
    const npcs = Array.from({ length: 20 }, (_, i) => npc(i + 1, i % 2 === 0 ? NPC_CATEGORY.enemy : NPC_CATEGORY.neutral));
    // NPCs 1–8 on map 5 (the open one), 9–20 only on map 6 (the tavern).
    const pieces = [...npcs.slice(0, 8).map((n) => piece(n.npcId, 5)), ...npcs.slice(8).map((n) => piece(n.npcId, 6))];

    expect(onMap(npcs, pieces, 5).map((n) => n.npcId)).toEqual([1, 2, 3, 4, 5, 6, 7, 8]);
    expect(onMap(npcs, pieces, 6)).toHaveLength(12);
  });

  it('keeps an NPC with two pieces once', () => {
    expect(onMap([npc(1, NPC_CATEGORY.enemy)], [piece(1, 5), piece(1, 5)], 5)).toHaveLength(1);
  });

  it('ignores pieces of another map and pieces that are not NPCs', () => {
    const npcs = [npc(1, NPC_CATEGORY.enemy), npc(2, NPC_CATEGORY.neutral)];
    expect(onMap(npcs, [piece(1, 6), piece(2, 5, MAP_TOKEN_TYPE.character), piece(2, 5, MAP_TOKEN_TYPE.object)], 5)).toEqual([]);
  });

  it('without an open campaign map keeps only the allies', () => {
    const npcs = [npc(1, NPC_CATEGORY.enemy), npc(2, NPC_CATEGORY.ally)];
    expect(onMap(npcs, [piece(1, 5)], null).map((n) => n.npcId)).toEqual([2]);
  });

  it('keeps an ally on every map, with or without a piece; as a neutral it follows the map', () => {
    const ally = npc(3, NPC_CATEGORY.ally, 70);
    expect(onMap([ally], [], 5)).toEqual([ally]);
    expect(onMap([ally], [piece(3, 6)], 5)).toEqual([ally]);
    const neutral = { ...ally, category: NPC_CATEGORY.neutral, masterCampaignCharacterId: null };
    expect(onMap([neutral], [piece(3, 6)], 5)).toEqual([]);
    expect(onMap([neutral], [piece(3, 6)], 6)).toEqual([neutral]);
  });

  it('places a newly included NPC only where the master may place pieces', () => {
    expect(afterAddAction(true)).toBe('place');
    expect(afterAddAction(false)).toBe('join');
  });
});

describe('groupNpcs', () => {
  it('keeps enemies and neutrals on the right, in order', () => {
    const groups = groupNpcs([npc(1, NPC_CATEGORY.enemy), npc(2, NPC_CATEGORY.neutral), npc(3, NPC_CATEGORY.ally)], []);
    expect(groups.right.map((n) => n.campaignNpcId)).toEqual([1, 2]);
    expect(groups.allies.map((n) => n.campaignNpcId)).toEqual([3]);
  });

  it('puts allies under their master character, when it is in the party', () => {
    const groups = groupNpcs([npc(3, NPC_CATEGORY.ally, 70), npc(4, NPC_CATEGORY.ally, 70), npc(5, NPC_CATEGORY.ally, 71)], [70]);
    expect(groups.byMaster.get(70)?.map((n) => n.campaignNpcId)).toEqual([3, 4]);
    // 71 is not an approved character of the party: the ally has no master to show under.
    expect(groups.allies.map((n) => n.campaignNpcId)).toEqual([5]);
  });
});

describe('commandsNpc / isAllyPiece / toCategory', () => {
  const piece = { tokenType: MAP_TOKEN_TYPE.npc, commanderUserId: 7, npcCategory: NPC_CATEGORY.ally };

  it('the master and the commander command an NPC piece; nobody commands other pieces through it', () => {
    expect(commandsNpc(piece, 7, false)).toBe(true);
    expect(commandsNpc(piece, 8, false)).toBe(false);
    expect(commandsNpc(piece, 8, true)).toBe(true);
    expect(commandsNpc({ ...piece, commanderUserId: null }, null, false)).toBe(false);
    expect(commandsNpc({ ...piece, tokenType: MAP_TOKEN_TYPE.character }, 7, false)).toBe(false);
  });

  it('knows an ally piece', () => {
    expect(isAllyPiece(piece)).toBe(true);
    expect(isAllyPiece({ ...piece, npcCategory: NPC_CATEGORY.neutral })).toBe(false);
    expect(isAllyPiece({ tokenType: MAP_TOKEN_TYPE.character, npcCategory: null })).toBe(false);
  });

  it('reads a select value', () => {
    expect(toCategory('3')).toBe(NPC_CATEGORY.ally);
    expect(toCategory(2)).toBe(NPC_CATEGORY.neutral);
    expect(toCategory('x')).toBe(NPC_CATEGORY.enemy);
  });
});
