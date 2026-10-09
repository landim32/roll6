/** The browser tab's title (040): what is open on the table, then the site name. */
export const APP_NAME = 'Roll6';

export interface DocumentTitleInput {
  /** Name of the open map (campaign map or library model); null when none is open. */
  mapName: string | null;
  campaignName: string | null;
  /** The open map belongs to the current campaign. */
  isCampaignMap: boolean;
}

export const documentTitle = ({ mapName, campaignName, isCampaignMap }: DocumentTitleInput): string => {
  const map = mapName?.trim() || null;
  const campaign = campaignName?.trim() || null;
  if (map && campaign && isCampaignMap) return `${map} — ${campaign} | ${APP_NAME}`;
  if (map) return `${map} | ${APP_NAME}`;
  if (campaign) return `${campaign} | ${APP_NAME}`;
  return APP_NAME;
};
