import { footprint } from './hexGrid';
import type { Offset } from './hexGrid';
import { MAP_TOKEN_TYPE } from '../types/mapToken';
import type { MapTokenInfo } from '../types/mapToken';
import type { ActionTargetWrite, TargetKind, TargetSide, TurnTargetInfo } from '../types/turn';

/**
 * "Ação sobre…" (098): what the map picked for an action — the hex and, when a piece covers it, that piece as the
 * table shows it. Pure; the server resolves and records the real snapshot (this only names the target in the window
 * and tells the server which piece the player saw).
 */
export interface ActionTargetPick {
  x: number;
  y: number;
  piece: { mapTokenId: number; name: string; kind: TargetKind; side: TargetSide } | null;
}

/** Category of a campaign NPC as `MapTokenInfo.npcCategory` carries it (071). */
const NPC_SIDE: Record<number, TargetSide> = { 1: 'enemy', 2: 'neutral', 3: 'ally' };

const kindOf = (piece: MapTokenInfo): TargetKind => {
  if (piece.tokenType === MAP_TOKEN_TYPE.character) return 'character';
  if (piece.tokenType === MAP_TOKEN_TYPE.npc) return 'npc';
  return 'object';
};

const sideOf = (piece: MapTokenInfo, actor: MapTokenInfo): TargetSide => {
  if (piece.mapTokenId === actor.mapTokenId) return 'self';
  if (piece.tokenType === MAP_TOKEN_TYPE.character) return 'ally';
  if (piece.tokenType === MAP_TOKEN_TYPE.npc) return NPC_SIDE[piece.npcCategory ?? 1] ?? 'enemy';
  return 'object';
};

/**
 * The piece whose whole shape covers the hex — when several share it (free mode), the one drawn on top: the last one
 * of the list, which is how `TokenLayer` paints them (the server picks the greatest id; the list is in id order).
 */
export const pieceCovering = (hex: Offset, pieces: MapTokenInfo[]): MapTokenInfo | null => {
  let found: MapTokenInfo | null = null;
  for (const piece of pieces) {
    if (footprint(piece.x, piece.y, piece.look, piece.space).some((h) => h.x === hex.x && h.y === hex.y)) found = piece;
  }
  return found;
};

/** What the click on `hex` targets for `actor` among the pieces of the open map. */
export const pickTarget = (hex: Offset, actor: MapTokenInfo, pieces: MapTokenInfo[]): ActionTargetPick => {
  const piece = pieceCovering(hex, pieces);
  return {
    x: hex.x,
    y: hex.y,
    piece: piece ? { mapTokenId: piece.mapTokenId, name: piece.name, kind: kindOf(piece), side: sideOf(piece, actor) } : null,
  };
};

/** The target as the window's title names it: the piece's name, "si mesmo" or "o hex (9, 7)". */
export const targetTitle = (pick: ActionTargetPick): string => {
  if (!pick.piece) return `o hex (${pick.x}, ${pick.y})`;
  if (pick.piece.side === 'self') return 'si mesmo';
  return pick.piece.name;
};

/** What goes to the server with the action. */
export const toTargetWrite = (pick: ActionTargetPick): ActionTargetWrite => ({
  x: pick.x, y: pick.y, mapTokenId: pick.piece?.mapTokenId ?? null,
});

const hexes = (distance: number): string => (distance === 1 ? '1 hex' : `${distance} hexes`);

/** The recorded target as the chat shows it under an action: "Goblin 2 (inimigo, NPC) · (9, 7) · 3 hexes". */
export const targetLabel = (target: TurnTargetInfo): string => {
  if (target.mapTokenId === null) return `o hex (${target.x}, ${target.y}) · ${hexes(target.distance)}`;
  if (target.side === 'self') return `si mesmo · (${target.x}, ${target.y})`;
  const who = target.sideLabel && target.kindLabel ? `${target.name} (${target.sideLabel}, ${target.kindLabel})` : target.name ?? '';
  return `${who} · (${target.x}, ${target.y}) · ${hexes(target.distance)}`;
};

/**
 * Enter sends the action window (098, FR-008) like the chat composer: Enter alone, not while composing with an IME;
 * Shift+Enter breaks the line.
 */
export const submitsOnEnter = (key: string, shiftKey: boolean, composing: boolean): boolean =>
  key === 'Enter' && !shiftKey && !composing;
