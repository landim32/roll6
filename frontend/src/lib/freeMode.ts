/**
 * Free mode of a campaign (054): while the master keeps it on, every action of an actor stays valid (the map shows
 * the last one), character and NPC pieces move any number of times without the Deslocamento limit, nothing is
 * recorded for those moves (so there is no trail), the turn finishes without a pending list and nobody is reminded.
 * The server decides all of that (`Campaign.FreeMode`); this module only decides what the screen offers.
 */
import { isPlayable } from './campaignStatus';
import { MOVEMENT_KIND } from './movement';
import type { MovementKind } from './movement';
import { MAP_TOKEN_TYPE } from '../types/mapToken';

/** True only when the campaign says so; a missing campaign or flag reads as turn mode. */
export const isFreeMode = (campaign: { freeMode?: boolean } | null | undefined): boolean => campaign?.freeMode === true;

/**
 * The pending pictures over the chat: only while the campaign plays and the master keeps the notice on (072) — in
 * free mode too, where only actions count because moves are not recorded. A missing flag reads as on.
 */
export const showPending = (campaign: { status?: number | null; pendingNotice?: boolean } | null | undefined): boolean =>
  !!campaign && isPlayable(campaign.status) && campaign.pendingNotice !== false;

/** Movement trails of the turn: hidden while free (even the moves made before the switch). */
export const showTrails = (freeMode: boolean): boolean => !freeMode;

/** How the Mover mode treats a piece: objects are always free; characters and NPCs are unlimited in free mode. */
export const movementKindFor = (tokenType: number, freeMode: boolean): MovementKind => {
  if (tokenType === MAP_TOKEN_TYPE.object) return MOVEMENT_KIND.free;
  return freeMode ? MOVEMENT_KIND.unlimited : MOVEMENT_KIND.limited;
};
