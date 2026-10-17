/**
 * Who an action of the chat composer names (080): the speaker's piece on the open map when there is one (the action
 * shows as a balloon over it, as before), else the character itself — a character of the campaign acts with or
 * without a piece.
 */
export type ActionTarget = { mapTokenId: number } | { campaignId: number; characterId: number };

export const actionTarget = (
  campaignId: number | null,
  participation: { characterId: number } | null,
  piece: { mapTokenId: number } | null,
): ActionTarget | null => {
  if (!participation || campaignId === null) return null;
  if (piece) return { mapTokenId: piece.mapTokenId };
  return { campaignId, characterId: participation.characterId };
};
