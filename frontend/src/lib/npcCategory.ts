import { MAP_TOKEN_TYPE } from '../types/mapToken';
import type { MapTokenInfo } from '../types/mapToken';
import { NPC_CATEGORY } from '../types/npc';
import type { CampaignNpcInfo, NpcCategory } from '../types/npc';

/**
 * NPC categories and allies (071). Enemies and neutrals stay in the right panel; allies go to the party's side — under
 * the card of their master character when they have one, else in the "Aliados" group. The owner of that master character
 * commands the ally's pieces (the server decides; `commanderUserId` comes with each piece). Pure, so it is unit-tested.
 */

export const isAlly = (npc: Pick<CampaignNpcInfo, 'category'>): boolean => npc.category === NPC_CATEGORY.ally;

/** The category from a select's value, falling back to Inimigo. */
export const toCategory = (value: string | number): NpcCategory => {
  const number = Number(value);
  return number === NPC_CATEGORY.neutral || number === NPC_CATEGORY.ally ? number : NPC_CATEGORY.enemy;
};

export interface NpcGroups {
  /** Enemies and neutrals: the right panel, in the order they came. */
  right: CampaignNpcInfo[];
  /** Allies without a master in the party. */
  allies: CampaignNpcInfo[];
  /** Allies under each master character, by its participation id. */
  byMaster: Map<number, CampaignNpcInfo[]>;
}

/** Splits the campaign NPCs into the panels; a master that is not in the approved party counts as none. */
export const groupNpcs = (npcs: readonly CampaignNpcInfo[], partyIds: readonly number[]): NpcGroups => {
  const party = new Set(partyIds);
  const groups: NpcGroups = { right: [], allies: [], byMaster: new Map() };
  for (const npc of npcs) {
    if (!isAlly(npc)) {
      groups.right.push(npc);
      continue;
    }
    const master = npc.masterCampaignCharacterId;
    if (master === null || !party.has(master)) {
      groups.allies.push(npc);
      continue;
    }
    groups.byMaster.set(master, [...(groups.byMaster.get(master) ?? []), npc]);
  }
  return groups;
};

/**
 * The NPCs of the scene (076): an ally always (it travels with the party), an enemy or neutral only while it has at least
 * one piece on the map open on screen — for players the campaign's current map (Q2 = A), for the master whatever map they
 * opened; the rule is the same for both (Q1 = A). No open campaign map (`mapId` null) leaves only the allies. Pieces of
 * another map, left over for an instant while a new map loads, are ignored. The input order is kept.
 */
export const onMap = (
  npcs: readonly CampaignNpcInfo[],
  pieces: readonly { tokenType: number; mapId: number; npcId: number | null }[],
  mapId: number | null,
): CampaignNpcInfo[] => {
  const present = new Set<number>();
  if (mapId !== null) {
    for (const piece of pieces) {
      if (piece.tokenType === MAP_TOKEN_TYPE.npc && piece.mapId === mapId && piece.npcId !== null) present.add(piece.npcId);
    }
  }
  return npcs.filter((npc) => isAlly(npc) || present.has(npc.npcId));
};

/**
 * What "Incluir NPC" does after an NPC joins the campaign (076, Q1 = A): with a map the master may place pieces on, it also
 * gets a piece there (otherwise its card would never show, as the panel lists only the scene); else it only joins.
 */
export const afterAddAction = (canPlace: boolean): 'place' | 'join' => (canPlace ? 'place' : 'join');

/** Whether this user commands the piece of an NPC (the campaign master always does). */
export const commandsNpc = (piece: Pick<MapTokenInfo, 'tokenType' | 'commanderUserId'>, userId: number | null | undefined, isMaster: boolean): boolean =>
  piece.tokenType === MAP_TOKEN_TYPE.npc && (isMaster || (userId != null && piece.commanderUserId === userId));

/** The piece is an ally's (its disc gets the ally color). */
export const isAllyPiece = (piece: { tokenType: number; npcCategory?: number | null }): boolean =>
  piece.tokenType === MAP_TOKEN_TYPE.npc && piece.npcCategory === NPC_CATEGORY.ally;
