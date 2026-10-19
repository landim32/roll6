import { describe, expect, it } from 'vitest';
import {
  CAMPAIGN_SECTIONS, LIBRARY_SECTIONS, animationEditorPath, campaignEditPath, campaignNewPath, characterPath, idParam,
  isAnimationEditorPath, isCampaignSection, isLibrarySection, libraryPath, mapEditPath, npcPath, sectionOf, tokenPath, weaponPath,
  LIBRARY_SUBSECTIONS, legacyTabPath, mapGeneratorPath, subsectionOf, subsectionPath,
} from './libraryRoutes';

describe('library routes (087)', () => {
  it('lists the sections in the nav order', () => {
    expect(LIBRARY_SECTIONS).toEqual(['campaigns', 'maps', 'characters', 'npcs', 'tokens', 'weapons', 'animations']);
    expect(CAMPAIGN_SECTIONS).toEqual(['characters', 'npcs', 'maps', 'plan']);
  });

  it('builds every path', () => {
    expect(libraryPath('tokens')).toBe('/library/tokens');
    expect(libraryPath('campaigns', { tab: 'search' })).toBe('/library/campaigns?tab=search');
    expect(campaignEditPath('a-mesa')).toBe('/library/campaigns/a-mesa/characters');
    expect(campaignEditPath('a mesa', 'plan')).toBe('/library/campaigns/a%20mesa/plan');
    expect(campaignNewPath()).toBe('/library/campaigns/new');
    expect(mapEditPath(4)).toBe('/library/maps/4');
    expect(characterPath('new')).toBe('/library/characters/new');
    expect(characterPath(9)).toBe('/library/characters/9');
    expect(npcPath(2)).toBe('/library/npcs/2');
    expect(tokenPath('new')).toBe('/library/tokens/new');
    expect(weaponPath(3)).toBe('/library/weapons/3');
  });

  it('finds the section of an address', () => {
    expect(sectionOf('/library/characters/9')).toBe('characters');
    expect(sectionOf('/library/campaigns/a/npcs')).toBe('campaigns');
    expect(sectionOf('/library')).toBeNull();
    expect(sectionOf('/map/x')).toBeNull();
    expect(sectionOf('/library/unknown')).toBeNull();
  });

  it('checks sections and ids', () => {
    expect(isLibrarySection('maps')).toBe(true);
    expect(isLibrarySection('plan')).toBe(false);
    expect(isCampaignSection('plan')).toBe(true);
    expect(isCampaignSection(undefined)).toBe(false);
    expect(idParam('12')).toBe(12);
    expect(idParam('new')).toBeNull();
    expect(idParam('0')).toBeNull();
    expect(idParam(undefined)).toBeNull();
  });
});

describe('animation editor route (089)', () => {
  it('puts the editor under the animation in the library', () => {
    expect(animationEditorPath(7)).toBe('/library/animations/7/editor');
  });

  it('recognises only the editor address', () => {
    expect(isAnimationEditorPath('/library/animations/7/editor')).toBe(true);
    expect(isAnimationEditorPath('/library/animations/7/editor/')).toBe(true);
    expect(isAnimationEditorPath('/library/animations/7')).toBe(false);
    expect(isAnimationEditorPath('/library/animations')).toBe(false);
    expect(isAnimationEditorPath('/animation/7')).toBe(false);
  });
});

describe('library submenus (090)', () => {
  it('lists the submenus in the menu order', () => {
    expect(LIBRARY_SUBSECTIONS.campaigns).toEqual(['mine', 'search', 'playing']);
    expect(LIBRARY_SUBSECTIONS.maps).toEqual(['mine', 'search', 'campaign', 'generator']);
    expect(subsectionOf('/library/maps/generator')).toEqual({ section: 'maps', subsection: 'generator' });
    expect(mapGeneratorPath()).toBe('/library/maps/generator');
    expect(mapGeneratorPath(7)).toBe('/library/maps/generator?model=7');
    expect(LIBRARY_SUBSECTIONS.tokens).toEqual(['mine', 'search']);
    expect(LIBRARY_SUBSECTIONS.weapons).toEqual(['mine', 'search']);
    expect(LIBRARY_SUBSECTIONS.animations).toEqual(['mine', 'search']);
    expect(LIBRARY_SUBSECTIONS.characters).toEqual([]);
    expect(LIBRARY_SUBSECTIONS.npcs).toEqual([]);
  });

  it('gives the first submenu the section address and the others one more segment', () => {
    expect(subsectionPath('campaigns', 'mine')).toBe('/library/campaigns');
    expect(subsectionPath('campaigns', 'search')).toBe('/library/campaigns/search');
    expect(subsectionPath('campaigns', 'playing')).toBe('/library/campaigns/playing');
    expect(subsectionPath('maps', 'campaign')).toBe('/library/maps/campaign');
    expect(subsectionPath('tokens', 'search')).toBe('/library/tokens/search');
    expect(subsectionPath('weapons', 'unknown')).toBe('/library/weapons');
  });

  it('reads the submenu of a list address only', () => {
    expect(subsectionOf('/library/campaigns')).toEqual({ section: 'campaigns', subsection: 'mine' });
    expect(subsectionOf('/library/campaigns/playing')).toEqual({ section: 'campaigns', subsection: 'playing' });
    expect(subsectionOf('/library/maps/search')).toEqual({ section: 'maps', subsection: 'search' });
    expect(subsectionOf('/library/animations/search')).toEqual({ section: 'animations', subsection: 'search' });
    expect(subsectionOf('/library/campaigns/a-torre/characters')).toBeNull();
    expect(subsectionOf('/library/campaigns/new')).toBeNull();
    expect(subsectionOf('/library/campaigns/mine')).toBeNull();
    expect(subsectionOf('/library/maps/12')).toBeNull();
    expect(subsectionOf('/library/characters')).toBeNull();
    expect(subsectionOf('/library/weapons/new')).toBeNull();
    expect(subsectionOf('/campaign/x')).toBeNull();
  });

  it('maps the 087 tabs to the submenus', () => {
    expect(legacyTabPath('campaigns', 'mine')).toBe('/library/campaigns');
    expect(legacyTabPath('campaigns', 'search')).toBe('/library/campaigns/search');
    expect(legacyTabPath('campaigns', 'playing')).toBe('/library/campaigns/playing');
    expect(legacyTabPath('maps', 'campaign')).toBe('/library/maps/campaign');
    expect(legacyTabPath('maps', 'mine')).toBe('/library/maps');
    expect(legacyTabPath('tokens', 'search')).toBe('/library/tokens/search');
    expect(legacyTabPath('weapons', 'upload')).toBe('/library/weapons/new');
    expect(legacyTabPath('animations', 'upload')).toBe('/library/animations/new');
    expect(legacyTabPath('animations', 'search')).toBe('/library/animations/search');
    expect(legacyTabPath('campaigns', 'bogus')).toBe('/library/campaigns');
  });

  it('builds the "new" pages of weapons and animations', () => {
    expect(weaponPath('new')).toBe('/library/weapons/new');
  });
});
