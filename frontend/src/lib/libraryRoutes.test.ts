import { describe, expect, it } from 'vitest';
import {
  CAMPAIGN_SECTIONS, LIBRARY_SECTIONS, animationEditorPath, animationPath, campaignEditPath, campaignNewPath, characterPath, idParam,
  isAnimationEditorPath, isCampaignSection, isLibrarySection, libraryPath, mapEditPath, npcPath, sectionOf, tokenPath, weaponPath,
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
    expect(animationPath(7)).toBe('/library/animations/7');
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
