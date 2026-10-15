import { describe, expect, it } from 'vitest';
import { commandsNpc, groupNpcs, isAllyPiece, toCategory } from './npcCategory';
import { MAP_TOKEN_TYPE } from '../types/mapToken';
import { NPC_CATEGORY } from '../types/npc';
import type { CampaignNpcInfo, NpcCategory } from '../types/npc';

const npc = (id: number, category: NpcCategory, master: number | null = null): CampaignNpcInfo => ({
  campaignNpcId: id, campaignId: 1, npcId: id, name: `NPC ${id}`, tokenId: 1, tokenImageUrl: null, imageUrl: null,
  life: 5, energy: 5, move: 5, mapNpcCount: 0, category, masterCampaignCharacterId: master, masterCharacterId: master ? master + 100 : null,
  createdAt: '',
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
