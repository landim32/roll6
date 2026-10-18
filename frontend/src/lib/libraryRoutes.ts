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

export const weaponPath = (id: number | 'new'): string => `${LIBRARY_ROOT}/weapons/${id}`;

export const animationPath = (id: number | 'new'): string => `${LIBRARY_ROOT}/animations/${id}`;

/** The animation editor (089; was `/animation/:id` in its own tab) inside the library. */
export const animationEditorPath = (id: number): string => `${LIBRARY_ROOT}/animations/${id}/editor`;

/** True on the editor's address: the library shows it edge to edge, without the content padding. */
export const isAnimationEditorPath = (pathname: string): boolean => /^\/library\/animations\/[^/]+\/editor\/?$/.test(pathname);

/**
 * The submenus of each section (090), in menu order; they replaced the list tabs of 087. The first one is the
 * section's own address, the others are one more segment (`/library/campaigns/search`). Sections without
 * subdivisions have none.
 */
export const LIBRARY_SUBSECTIONS = {
  campaigns: ['mine', 'search', 'playing'],
  maps: ['mine', 'search', 'campaign'],
  characters: [],
  npcs: [],
  tokens: ['mine', 'search'],
  weapons: ['mine', 'search'],
  animations: ['mine', 'search'],
} as const satisfies Record<LibrarySection, readonly string[]>;

export type CampaignSubsection = (typeof LIBRARY_SUBSECTIONS.campaigns)[number];
export type MapSubsection = (typeof LIBRARY_SUBSECTIONS.maps)[number];
/** Tokens, weapons and animations: the user's own and the whole library. */
export type OwnSubsection = 'mine' | 'search';

const subsectionsOf = (section: LibrarySection): readonly string[] => LIBRARY_SUBSECTIONS[section];

/** The address of a submenu: the first one is the section's own address. */
export const subsectionPath = (section: LibrarySection, subsection: string): string => {
  const list = subsectionsOf(section);
  return list.indexOf(subsection) > 0 ? `${LIBRARY_ROOT}/${section}/${subsection}` : `${LIBRARY_ROOT}/${section}`;
};

/**
 * The submenu an address shows, or null when it is not a list (an item, "new", the campaign page, another section).
 * `/library/campaigns` is the first submenu; `/library/campaigns/search` the named one.
 */
export const subsectionOf = (pathname: string): { section: LibrarySection; subsection: string } | null => {
  const parts = pathname.split('/').filter(Boolean);
  if (parts[0] !== LIBRARY_ROOT.slice(1) || !isLibrarySection(parts[1])) return null;
  const section = parts[1];
  const list = subsectionsOf(section);
  if (list.length === 0) return null;
  if (parts.length === 2) return { section, subsection: list[0] };
  if (parts.length === 3 && list.indexOf(parts[2]) > 0) return { section, subsection: parts[2] };
  return null;
};

/**
 * Where an 087 address with `?tab=` goes now (090): the submenu of the same name, "upload" of weapons and animations
 * to their "new" page; an unknown tab to the section's first submenu.
 */
export const legacyTabPath = (section: LibrarySection, tab: string): string => {
  if (tab === 'upload' && (section === 'weapons' || section === 'animations')) return `${LIBRARY_ROOT}/${section}/new`;
  return subsectionPath(section, subsectionsOf(section).includes(tab) ? tab : '');
};

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
