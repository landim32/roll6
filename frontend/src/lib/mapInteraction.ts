import type { MoveState, Offset } from './hexGrid';
import { currentStatus, MOVEMENT_KIND, previewHexes, previewOf } from './movement';
import type { MovementState, MovementStatus } from './movement';
import { tokenAt } from './mapTokens';
import { commandsNpc } from './npcCategory';
import { pieceHexes } from './occupancy';
import { isPlayable } from './campaignStatus';
import { hasMoved } from './turnStatus';
import { MAP_TOKEN_TYPE } from '../types/mapToken';
import type { MapTokenInfo } from '../types/mapToken';
import type { CampaignCharacterInfo } from '../types/campaignCharacter';
import type { TurnInfo } from '../types/turn';

/**
 * Who may do what with a piece of the open map, and what the "Mover" mode draws (015/016/031/054/071/098) — the rules
 * of the hex menu, shared by the 2D map and the isometric view (105) so both offer exactly the same thing. Pure.
 */
export interface MapInteractionContext {
  /** The open campaign map (null = a map model without a campaign map). */
  mapId: number | null;
  /** The master of the campaign (writes any piece). */
  canPlace: boolean;
  /** The map may be edited by this user at all (049) — players place their own characters. */
  canPlaceOwn: boolean;
  freeMode: boolean;
  turnNo: number | null;
  campaignStatus: number | null | undefined;
  turnEntries: TurnInfo[];
  party: CampaignCharacterInfo[];
  userId: number | null | undefined;
}

/**
 * Who may move a piece (015): the master any piece of the open campaign map; a player only the pieces of
 * his own characters.
 */
export const isOwnCharacter = (token: MapTokenInfo, ctx: Pick<MapInteractionContext, 'party' | 'userId'>): boolean =>
  token.tokenType === MAP_TOKEN_TYPE.character
  && ctx.party.some((p) => p.campaignCharacterId === token.campaignCharacterId && p.characterOwnerId === ctx.userId);

/** A player's own piece: his character, or an ally NPC he commands through its master character (071). */
export const isOwnPiece = (token: MapTokenInfo, ctx: Pick<MapInteractionContext, 'party' | 'userId'>): boolean =>
  isOwnCharacter(token, ctx) || commandsNpc(token, ctx.userId, false);

/** Characters and NPCs move once per turn (016); objects move freely; in free mode (054) everyone does. */
export const canMove = (token: MapTokenInfo, ctx: MapInteractionContext): boolean => {
  if (ctx.mapId === null || !ctx.canPlaceOwn) return false;
  if (!ctx.canPlace && !isOwnPiece(token, ctx)) return false;
  return token.tokenType === MAP_TOKEN_TYPE.object || ctx.freeMode || !hasMoved(ctx.turnEntries, token);
};

/** "Agir"/"Resetar turno" (016): the master on characters and NPCs, a player on his own characters. */
export const canTakeTurn = (token: MapTokenInfo, ctx: MapInteractionContext): boolean => {
  if (ctx.mapId === null || ctx.turnNo === null || token.tokenType === MAP_TOKEN_TYPE.object) return false;
  // 049: acting and resetting only while the campaign plays (not even the master while preparing).
  if (!isPlayable(ctx.campaignStatus)) return false;
  return ctx.canPlace || isOwnPiece(token, ctx);
};

/** Posture (031): the master on characters and NPCs, a player on his own characters and commanded allies (071). */
export const canSetPosture = (token: MapTokenInfo, ctx: MapInteractionContext): boolean =>
  ctx.mapId !== null && ctx.canPlaceOwn && token.tokenType !== MAP_TOKEN_TYPE.object && (ctx.canPlace || isOwnPiece(token, ctx));

/** Players only get a menu (Mover / Agir / Resetar turno / Postura) on the pieces they may use; the master everywhere. */
export const menuAllowed = (piece: MapTokenInfo | undefined, ctx: MapInteractionContext): boolean =>
  ctx.canPlace || (!!piece && (canMove(piece, ctx) || canTakeTurn(piece, ctx) || canSetPosture(piece, ctx)));

/** A hex, or the whole shape of the piece on it (031). */
export const shapeAt = (hex: Offset | null, tokens: MapTokenInfo[]): { hexes: Offset[]; pieceId: number | null } | null => {
  if (!hex) return null;
  const piece = tokenAt(tokens, hex.x, hex.y);
  return piece ? { hexes: pieceHexes(piece), pieceId: piece.mapTokenId } : { hexes: [hex], pieceId: null };
};

/** What the "Mover" mode draws: the trail, the destination shape, its color and the piece's previewed place. */
export interface MovementOverlay {
  trail: MoveState[];
  destination: Offset[];
  status: MovementStatus;
  preview: { mapTokenId: number; x: number; y: number; look: number };
  /** The spent/total counter shows (characters and NPCs outside free mode). */
  counted: boolean;
}

export const movementOverlay = (state: MovementState): MovementOverlay | null => {
  const status = currentStatus(state);
  const preview = previewOf(state);
  if (state.phase === 'idle' || !status || !preview) return null;
  // An unlimited piece (054) outlines the target even where it does not fit (red), since there is no path to show.
  const destination = state.phase === 'facing'
    || (state.phase === 'path' && (state.cost !== null || state.piece.kind === MOVEMENT_KIND.unlimited))
    ? previewHexes(state) : [];
  return {
    trail: state.trail,
    destination,
    status,
    preview: { mapTokenId: state.piece.mapTokenId, ...preview },
    counted: state.piece.kind === MOVEMENT_KIND.limited,
  };
};
