import { CAMPAIGN_STATUS } from './campaignStatus';
import type { CharacterSelection } from './characterSelection';
import type { CampaignTableInfo, TableMapInfo } from '../types/campaign';

/** A map line of the table combo (078). */
export interface TableMapEntry {
  key: string;
  label: string;
  path: string;
  /** It is the map open now. */
  active: boolean;
}

/** One campaign in the table combo: the campaign line and the map lines under it. */
export interface TableEntry {
  key: string;
  campaignLabel: string;
  campaignPath: string;
  campaignActive: boolean;
  /** The user masters this campaign (its maps are all the active ones), else plays in it (only his character's map). */
  isMaster: boolean;
  /** Empty when the campaign has no map to offer (the empty line opens the campaign). */
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

export const mapPath = (slug: string) => `/map/${encodeURIComponent(slug)}`;

/**
 * The maps a player has in a campaign (108): the server sends only the ones with his characters, and the chosen character
 * narrows them to its map. Nothing chosen there yet leaves them all (the choice only exists once the campaign is opened).
 */
export const playerMaps = (
  campaign: Pick<CampaignTableInfo, 'campaignId' | 'maps'>,
  selections: Record<string, CharacterSelection>,
): TableMapInfo[] => {
  const chosen = selections[campaign.campaignId];
  return typeof chosen === 'number' ? campaign.maps.filter((map) => map.characterIds.includes(chosen)) : campaign.maps;
};

/**
 * One entry per campaign the combo offers (078): the master gets every active map of the campaign, a player only the map
 * of his chosen character (108) — he never picks another map here. Choosing a map only opens it.
 */
export const tableEntries = (
  campaigns: CampaignTableInfo[],
  open: OpenTable,
  selections: Record<string, CharacterSelection> = {},
): TableEntry[] =>
  campaigns.filter(showsInTable).map((campaign) => ({
    key: String(campaign.campaignId),
    campaignLabel: campaign.name,
    campaignPath: `/campaign/${encodeURIComponent(campaign.slug)}`,
    campaignActive: open.campaignId === campaign.campaignId,
    isMaster: campaign.isMaster,
    maps: (campaign.isMaster ? campaign.maps : playerMaps(campaign, selections)).map((map) => ({
      key: `${campaign.campaignId}:${map.mapId}`,
      label: map.name,
      path: mapPath(map.slug),
      active: open.mapId === map.mapId,
    })),
  }));
