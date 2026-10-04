import { describe, expect, it } from 'vitest';
import { activeWalls, createEmptyDraft, DEFAULT_GRID_SIZE, draftFromMapModel, isSameDraft, isStoryMap, toMapModelInsert } from './draft';
import { MAP_KIND } from '../types/mapModel';
import type { MapModelInfo } from '../types/mapModel';
import type { MapInfo } from '../types/map';

const model: MapModelInfo = {
  mapModelId: 7, userId: 1, name: 'Taverna', description: 'Salão', image: 'abc.png', imageUrl: 'https://x/abc.png',
  gridWidth: 12, gridHeight: 9, imageWidth: 1600, imageHeight: 1200, imageTop: 10, imageLeft: 20, hexSize: 60,
  kind: 1, walls: [], skyImage: null, skyImageUrl: null,
  createdAt: '', changedAt: '',
};

describe('draft', () => {
  it('starts empty with the default grid', () => {
    const draft = createEmptyDraft();
    expect(draft.mapModelId).toBeNull();
    expect(draft.mapSlug).toBeNull();
    expect(draft.gridWidth).toBe(DEFAULT_GRID_SIZE);
    expect(draft.gridHeight).toBe(DEFAULT_GRID_SIZE);
    expect(draft.image).toBeNull();
  });

  it('copies the model and uses the campaign map name when opened from a campaign', () => {
    const map = { mapId: 3, campaignId: 5, name: 'Taverna 1', slug: 'taverna-1' } as MapInfo;
    const draft = draftFromMapModel(model, map);
    expect(draft).toMatchObject({
      mapModelId: 7, mapId: 3, mapSlug: 'taverna-1', campaignId: 5, ownerUserId: 1, name: 'Taverna 1', modelName: 'Taverna',
    });
    expect(draft).toMatchObject({ gridWidth: 12, gridHeight: 9, imageWidth: 1600, imageHeight: 1200, imageTop: 10, imageLeft: 20 });
  });

  it('is dirty only when a saved field changes', () => {
    const saved = draftFromMapModel(model);
    expect(isSameDraft(saved, { ...saved, name: 'Outro nome', imageUrl: 'https://renewed', mapSlug: 'outro' })).toBe(true);
    expect(isSameDraft(saved, { ...saved, gridWidth: 13 })).toBe(false);
    expect(isSameDraft(saved, { ...saved, imageLeft: 0 })).toBe(false);
    expect(isSameDraft(saved, { ...saved, image: 'other.png' })).toBe(false);
  });

  it('builds the save payload with every layout field', () => {
    expect(toMapModelInsert(draftFromMapModel(model), 'Nova', null)).toEqual({
      name: 'Nova', description: null, image: 'abc.png', gridWidth: 12, gridHeight: 9,
      imageWidth: 1600, imageHeight: 1200, imageTop: 10, imageLeft: 20, kind: 1, walls: [], skyImage: null,
    });
  });

  // 033 — story maps
  it('starts as a 2D map without walls or sky', () => {
    expect(createEmptyDraft()).toMatchObject({ kind: MAP_KIND.battle, walls: [], skyImage: null, skyImageUrl: null });
  });

  it('reads kind, walls and sky from the model', () => {
    const draft = draftFromMapModel({
      ...model, kind: 2, walls: [[3, 1], [0, 0]], skyImage: 'sky.jpg', skyImageUrl: 'https://x/sky.jpg',
    });

    expect(draft).toMatchObject({ kind: 2, walls: [{ x: 0, y: 0 }, { x: 3, y: 1 }], skyImage: 'sky.jpg', skyImageUrl: 'https://x/sky.jpg' });
    expect(isStoryMap(draft)).toBe(true);
    expect(activeWalls(draft)).toEqual([{ x: 0, y: 0 }, { x: 3, y: 1 }]);
    expect(activeWalls({ ...draft, kind: 1 })).toEqual([]);
  });

  it('is dirty when kind, walls or sky change, but not the sky URL alone', () => {
    const saved = draftFromMapModel({ ...model, kind: 2, walls: [[1, 1]] });

    expect(isSameDraft(saved, { ...saved, kind: 1 })).toBe(false);
    expect(isSameDraft(saved, { ...saved, walls: [] })).toBe(false);
    expect(isSameDraft(saved, { ...saved, walls: [{ x: 1, y: 1 }] })).toBe(true);
    expect(isSameDraft(saved, { ...saved, skyImage: 'sky.jpg' })).toBe(false);
    expect(isSameDraft(saved, { ...saved, skyImageUrl: 'https://renewed' })).toBe(true);
  });

  it('sends the walls as pairs, dropping those outside the grid', () => {
    const draft = { ...draftFromMapModel(model), kind: 2, walls: [{ x: 1, y: 1 }, { x: 15, y: 2 }], skyImage: 'sky.jpg' };

    expect(toMapModelInsert(draft, 'Nova', null)).toMatchObject({ kind: 2, walls: [[1, 1]], skyImage: 'sky.jpg' });
  });
});
