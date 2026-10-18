/**
 * The addresses of the library (087): one section per kind of thing the user keeps — campaigns, maps, characters,
 * NPCs, tokens, weapons, animations — each with its list, its "new" page and the page of one item; the campaign page
 * has its own sections. Pure, so the nav, the pages and the table's entry points agree on the paths.
 */

export const LIBRARY_ROOT = '/library';

export const LIBRARY_SECTIONS = ['campaigns', 'maps', 'characters', 'npcs', 'tokens', 'weapons', 'animations'] as const;
export type LibrarySection = (typeof LIBRARY_SECTIONS)[number];

export const CAMPAIGN_SECTIONS = ['characters', 'npcs', 'maps', 'plan'] as const;
export type CampaignSection = (typeof CAMPAIGN_SECTIONS)[number];

export const isLibrarySection = (value: string | undefined | null): value is LibrarySection =>
  !!value && (LIBRARY_SECTIONS as readonly string[]).includes(value);

export const isCampaignSection = (value: string | undefined | null): value is CampaignSection =>
  !!value && (CAMPAIGN_SECTIONS as readonly string[]).includes(value);

export const libraryPath = (section: LibrarySection, query?: Record<string, string>): string => {
  const search = query && Object.keys(query).length > 0 ? `?${new URLSearchParams(query).toString()}` : '';
  return `${LIBRARY_ROOT}/${section}${search}`;
};

export const campaignEditPath = (slug: string, section: CampaignSection = 'characters'): string =>
  `${LIBRARY_ROOT}/campaigns/${encodeURIComponent(slug)}/${section}`;

export const campaignNewPath = (): string => `${LIBRARY_ROOT}/campaigns/new`;

export const mapEditPath = (mapModelId: number): string => `${LIBRARY_ROOT}/maps/${mapModelId}`;

export const characterPath = (id: number | 'new'): string => `${LIBRARY_ROOT}/characters/${id}`;

export const npcPath = (id: number | 'new'): string => `${LIBRARY_ROOT}/npcs/${id}`;

export const tokenPath = (id: number | 'new'): string => `${LIBRARY_ROOT}/tokens/${id}`;

export const weaponPath = (id: number): string => `${LIBRARY_ROOT}/weapons/${id}`;

export const animationPath = (id: number): string => `${LIBRARY_ROOT}/animations/${id}`;

/** The section an address belongs to (the nav highlights it), or null outside the library. */
export const sectionOf = (pathname: string): LibrarySection | null => {
  const parts = pathname.split('/').filter(Boolean);
  if (parts[0] !== LIBRARY_ROOT.slice(1)) return null;
  return isLibrarySection(parts[1]) ? parts[1] : null;
};

/** A route parameter as a positive integer id, or null ("new", junk). */
export const idParam = (value: string | undefined): number | null => {
  const id = Number(value);
  return Number.isInteger(id) && id > 0 ? id : null;
};
