import type { CampaignTableInfo } from '../types/campaign';

/** One campaign in the table combo: the map line and the campaign line. */
export interface TableEntry {
  key: string;
  /** Null when the campaign has no active map. */
  mapLabel: string | null;
  mapPath: string;
  campaignLabel: string;
  campaignPath: string;
  mapActive: boolean;
  campaignActive: boolean;
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

/** One entry per campaign. A campaign without an active map sends both lines to the campaign. */
export const tableEntries = (campaigns: CampaignTableInfo[], open: OpenTable): TableEntry[] =>
  campaigns.map((campaign) => {
    const campaignPath = `/campaign/${encodeURIComponent(campaign.slug)}`;
    const hasMap = campaign.currentMapId !== null && !!campaign.currentMapSlug;
    return {
      key: String(campaign.campaignId),
      mapLabel: hasMap ? campaign.currentMapName : null,
      mapPath: hasMap ? `/map/${encodeURIComponent(campaign.currentMapSlug!)}` : campaignPath,
      campaignLabel: campaign.name,
      campaignPath,
      mapActive: hasMap && open.mapId === campaign.currentMapId,
      campaignActive: open.campaignId === campaign.campaignId,
    };
  });
