import { CAMPAIGN_STATUS } from './campaignStatus';
import { MAP_STATUS_CURRENT } from '../types/map';
import type { CampaignTableInfo } from '../types/campaign';

/** A map line of the table combo (078). */
export interface TableMapEntry {
  key: string;
  label: string;
  path: string;
  /** The campaign's current map ("Atual"). */
  isCurrent: boolean;
  /** It is the map open now. */
  active: boolean;
}

/** One campaign in the table combo: the campaign line and the map lines under it. */
export interface TableEntry {
  key: string;
  campaignLabel: string;
  campaignPath: string;
  campaignActive: boolean;
  /** The user masters this campaign (its maps are all the playable ones), else plays in it (only the current map). */
  isMaster: boolean;
  /** Empty when the campaign has no map to offer (the line "Sem mapa ativo" opens the campaign). */
  maps: TableMapEntry[];
}

/** What is open, used to mark the active lines. */
export interface OpenTable {
  campaignId: number | null;
  mapId: number | null;
}

/** The two lines of the closed combo. Empty map name means nothing is open. */
export interface TriggerLabels {
  map: string;
  campaign: string | null;
}

export const triggerLabels = (draftName: string, campaignName: string | null): TriggerLabels => ({
  map: draftName.trim(),
  campaign: campaignName,
});

/**
 * Which campaigns the combo offers (078), by the user's role in each: as the master, the ones being prepared or
 * active; as a player, only the active ones. A missing status reads as active (049).
 */
export const showsInTable = (campaign: Pick<CampaignTableInfo, 'status' | 'isMaster'>): boolean => {
  const status = campaign.status ?? CAMPAIGN_STATUS.active;
  return campaign.isMaster
    ? status === CAMPAIGN_STATUS.active || status === CAMPAIGN_STATUS.preparing
    : status === CAMPAIGN_STATUS.active;
};

const mapPath = (slug: string) => `/map/${encodeURIComponent(slug)}`;

/**
 * One entry per campaign the combo offers (078): the master gets every current and active map of the campaign (the
 * current one first and marked), a player only its current map — he never picks another map here. Choosing a map only
 * opens it: the current map changes only through "Tornar atual".
 */
export const tableEntries = (campaigns: CampaignTableInfo[], open: OpenTable): TableEntry[] =>
  campaigns.filter(showsInTable).map((campaign) => {
    const current = campaign.currentMapId !== null && campaign.currentMapSlug
      ? [{ mapId: campaign.currentMapId, name: campaign.currentMapName ?? '', slug: campaign.currentMapSlug, status: MAP_STATUS_CURRENT }]
      : [];
    // The master's list comes from the server; an older answer without it falls back to the current map.
    const maps = campaign.isMaster && campaign.maps ? campaign.maps : current;
    return {
      key: String(campaign.campaignId),
      campaignLabel: campaign.name,
      campaignPath: `/campaign/${encodeURIComponent(campaign.slug)}`,
      campaignActive: open.campaignId === campaign.campaignId,
      isMaster: campaign.isMaster,
      maps: maps.map((map) => ({
        key: `${campaign.campaignId}:${map.mapId}`,
        label: map.name,
        path: mapPath(map.slug),
        isCurrent: map.status === MAP_STATUS_CURRENT || map.mapId === campaign.currentMapId,
        active: open.mapId === map.mapId,
      })),
    };
  });
