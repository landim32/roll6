/** Where the table URL points. `slug` is null on the root. */
export interface TablePath {
  kind: 'root' | 'campaign' | 'map';
  slug: string | null;
}

/** What is open, used to build the address that should be in the bar. */
export interface TableLocation {
  campaignSlug: string | null;
  mapSlug: string | null;
  mapCampaignId: number | null;
  campaignId: number | null;
}

const decodeSegment = (segment: string): string => {
  try {
    return decodeURIComponent(segment);
  } catch {
    return segment;
  }
};

/** `/campaign/x` and `/map/x`, with or without a trailing slash. Anything else is the root. */
export const parseTablePath = (pathname: string): TablePath => {
  const path = pathname.length > 1 && pathname.endsWith('/') ? pathname.slice(0, -1) : pathname;
  const campaign = /^\/campaign\/([^/]+)$/.exec(path);
  if (campaign) return { kind: 'campaign', slug: decodeSegment(campaign[1]) };
  const map = /^\/map\/([^/]+)$/.exec(path);
  if (map) return { kind: 'map', slug: decodeSegment(map[1]) };
  return { kind: 'root', slug: null };
};

/** True for `/campaign/:slug` and `/map/:slug` (the addresses login may return to). */
export const isTablePath = (pathname: string): boolean => parseTablePath(pathname).kind !== 'root';

/**
 * Address for the open table: the campaign map when one of the current campaign is open,
 * otherwise the campaign, otherwise the root.
 */
export const tablePathFor = ({ campaignSlug, mapSlug, mapCampaignId, campaignId }: TableLocation): string => {
  if (mapSlug && campaignId !== null && mapCampaignId === campaignId)
    return `/map/${encodeURIComponent(mapSlug)}`;
  if (campaignSlug) return `/campaign/${encodeURIComponent(campaignSlug)}`;
  return '/';
};
