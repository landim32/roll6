/**
 * Which map of a campaign the site shows (039, 108): the master opens any map; a player sees only the map of his chosen
 * character — another one sends him there, and with the character off every map nothing opens. A visual rule: the API
 * still lets players read every map of their campaign, only the site and the real-time piece events hold back the others.
 */
import { resolveSelection } from './characterSelection';
import type { CharacterSelection } from './characterSelection';
import { CAMPAIGN_CHARACTER_STATUS } from '../types/campaignCharacter';
import type { CampaignCharacterInfo } from '../types/campaignCharacter';
import type { TableMapInfo } from '../types/campaign';

export interface ViewerMapInput {
  isMaster: boolean;
  mapId: number;
  /** Campaign the map belongs to. */
  mapCampaignId: number;
  /** Campaign whose rule applies (the map's campaign, as loaded). */
  campaignId: number;
  /** Map of the viewer's chosen character; null off every map. */
  ownMapId: number | null;
}

export interface ViewerMapDecision {
  kind: 'open' | 'redirect' | 'none';
  /** The map to open instead (redirect). */
  mapId?: number;
}

export const isMasterOf = (campaign: { userId: number }, userId: number | null | undefined): boolean =>
  userId !== null && userId !== undefined && campaign.userId === userId;

export const viewerMapDecision = ({ isMaster, mapId, mapCampaignId, campaignId, ownMapId }: ViewerMapInput): ViewerMapDecision => {
  if (isMaster || mapCampaignId !== campaignId || mapId === ownMapId) return { kind: 'open' };
  if (ownMapId === null) return { kind: 'none' };
  return { kind: 'redirect', mapId: ownMapId };
};

/** The campaign maps a viewer may pick: all of them for the master, only his character's for anyone else. */
export const visibleCampaignMaps = <T extends { mapId: number }>(
  items: T[],
  { isMaster, ownMapId }: { isMaster: boolean; ownMapId: number | null },
): T[] => (isMaster ? items : items.filter((item) => item.mapId === ownMapId));

/** The approved participation of the chosen character; null for the GM, without a choice or without that character. */
export const ownParticipationOf = (
  selection: CharacterSelection | null,
  participations: CampaignCharacterInfo[],
): CampaignCharacterInfo | null => {
  if (typeof selection !== 'number') return null;
  return participations.find((p) => p.characterId === selection && p.status === CAMPAIGN_CHARACTER_STATUS.approved) ?? null;
};

/** The map of the chosen character. Only the participations of the user himself: the party hides other maps. */
export const ownMapOf = (selection: CharacterSelection | null, participations: CampaignCharacterInfo[]): number | null =>
  ownParticipationOf(selection, participations)?.mapId ?? null;

/**
 * The same outside React (108 R4): the address and the remembered map are resolved before `CharacterContext` has this
 * campaign, so the choice comes from the stored selections and the participations just read.
 */
export const storedOwnMap = (
  campaignId: number,
  participations: CampaignCharacterInfo[],
  selections: Record<string, CharacterSelection>,
): number | null => {
  const options = participations
    .filter((p) => p.status === CAMPAIGN_CHARACTER_STATUS.approved)
    .map((p) => ({ key: p.characterId }));
  return ownMapOf(resolveSelection(selections[campaignId], options), participations);
};

/** The map the master lands on (108 FR-020): the one with most characters, then the newest; none without characters. */
export const masterDefaultMap = (maps: Pick<TableMapInfo, 'mapId' | 'characterCount'>[]): number | null => {
  const best = maps
    .filter((map) => map.characterCount > 0)
    .reduce<Pick<TableMapInfo, 'mapId' | 'characterCount'> | null>((top, map) => {
      if (!top || map.characterCount > top.characterCount) return map;
      return map.characterCount === top.characterCount && map.mapId > top.mapId ? map : top;
    }, null);
  return best?.mapId ?? null;
};
