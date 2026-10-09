/**
 * Which map of a campaign the site shows (039): the master opens any map; anyone else sees only the campaign's
 * current map — another one sends them to the current map, and without a current map nothing opens. A visual rule:
 * the API still lets players read every map of their campaign (039 FR-009), only the site and the real-time piece
 * events (TableEventAudience) hold back the others.
 */

export interface ViewerMapInput {
  isMaster: boolean;
  mapId: number;
  /** Campaign the map belongs to. */
  mapCampaignId: number;
  /** Campaign whose rule applies (the map's campaign, as loaded). */
  campaignId: number;
  currentMapId: number | null;
}

export interface ViewerMapDecision {
  kind: 'open' | 'redirect' | 'none';
  /** The map to open instead (redirect). */
  mapId?: number;
}

export const isMasterOf = (campaign: { userId: number }, userId: number | null | undefined): boolean =>
  userId !== null && userId !== undefined && campaign.userId === userId;

export const viewerMapDecision = ({ isMaster, mapId, mapCampaignId, campaignId, currentMapId }: ViewerMapInput): ViewerMapDecision => {
  if (isMaster || mapCampaignId !== campaignId || mapId === currentMapId) return { kind: 'open' };
  if (currentMapId === null) return { kind: 'none' };
  return { kind: 'redirect', mapId: currentMapId };
};

/** The campaign maps a viewer may pick: all of them for the master, only the current one for anyone else. */
export const visibleCampaignMaps = <T extends { mapId: number }>(
  items: T[],
  { isMaster, currentMapId }: { isMaster: boolean; currentMapId: number | null },
): T[] => (isMaster ? items : items.filter((item) => item.mapId === currentMapId));
