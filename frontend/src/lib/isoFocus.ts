import type { CampaignCharacterInfo } from '../types/campaignCharacter';
import type { MapTokenInfo } from '../types/mapToken';
import { MAP_TOKEN_TYPE } from '../types/mapToken';
import { footprint, gridPixelSize, hexCenter, HEX_SIZE } from './hexGrid';
import type { Offset, Point } from './hexGrid';

/**
 * Who the isometric view (103) looks at: the camera follows one character and the light circle is around it. The focus
 * is the viewer's own — never stored, never sent. Pure.
 */

/** A character that can take the focus: an approved one of the party with a piece on the open map. */
export interface FocusCandidate {
  campaignCharacterId: number;
  characterId: number;
  name: string;
  mapTokenId: number;
  /** Middle of the hex of its piece (map px). */
  center: Point;
}

/** The party's characters with a character piece on `mapId`, in the party panel's order. */
export const focusCandidates = (
  party: readonly CampaignCharacterInfo[],
  tokens: readonly MapTokenInfo[],
  mapId: number | null,
): FocusCandidate[] => {
  if (mapId === null) return [];
  return party.flatMap((participation) => {
    const piece = tokens.find((token) => token.mapId === mapId && token.tokenType === MAP_TOKEN_TYPE.character
      && token.campaignCharacterId === participation.campaignCharacterId);
    return piece
      ? [{
        campaignCharacterId: participation.campaignCharacterId,
        characterId: participation.characterId,
        name: participation.characterName,
        mapTokenId: piece.mapTokenId,
        center: hexCenter(piece.x, piece.y, HEX_SIZE),
      }]
      : [];
  });
};

/** The viewer's own character among the candidates: the one chosen in "Personagem atual"; null for the GM or without a piece. */
export const ownCandidate = (
  candidates: readonly FocusCandidate[],
  chosenCharacterId: number | null,
): FocusCandidate | null => (chosenCharacterId === null ? null : candidates.find((c) => c.characterId === chosenCharacterId) ?? null);

/** The focus when the view opens: the viewer's own character, else the first of the party with a piece, else none. */
export const initialFocus = (candidates: readonly FocusCandidate[], chosenCharacterId: number | null): number | null =>
  (ownCandidate(candidates, chosenCharacterId) ?? candidates[0])?.campaignCharacterId ?? null;

/** Keeps the focus while that character still has a piece on the map; otherwise goes back to the initial one. */
export const resolveFocus = (
  current: number | null,
  candidates: readonly FocusCandidate[],
  chosenCharacterId: number | null,
): number | null => (current !== null && candidates.some((c) => c.campaignCharacterId === current)
  ? current
  : initialFocus(candidates, chosenCharacterId));

/** Where the light and the camera are: the focused piece, or the middle of the grid without one. */
export const focusCenter = (
  focus: number | null,
  candidates: readonly FocusCandidate[],
  columns: number,
  rows: number,
): Point => {
  const found = focus === null ? undefined : candidates.find((c) => c.campaignCharacterId === focus);
  if (found) return found.center;
  const { width, height } = gridPixelSize(columns, rows, HEX_SIZE);
  return { x: width / 2, y: height / 2 };
};

/** The candidate whose piece covers `hex` (a click on the floor of the view), or null. */
export const candidateAt = (
  hex: Offset,
  tokens: readonly MapTokenInfo[],
  candidates: readonly FocusCandidate[],
): FocusCandidate | null => candidates.find((candidate) => {
  const piece = tokens.find((token) => token.mapTokenId === candidate.mapTokenId);
  return !!piece && footprint(piece.x, piece.y, piece.look, piece.space).some((h) => h.x === hex.x && h.y === hex.y);
}) ?? null;
