import { describe, expect, it } from 'vitest';
import { createEmptyDraft, DEFAULT_GRID_SIZE, draftFromMapModel, isSameDraft, toMapModelInsert } from './draft';
import type { MapModelInfo } from '../types/mapModel';
import type { MapInfo } from '../types/map';

const model: MapModelInfo = {
  mapModelId: 7, userId: 1, name: 'Taverna', description: 'Salão', image: 'abc.png', imageUrl: 'https://x/abc.png',
  gridWidth: 12, gridHeight: 9, imageWidth: 1600, imageHeight: 1200, imageTop: 10, imageLeft: 20, hexSize: 60,
  createdAt: '', changedAt: '',
};

describe('draft', () => {
  it('starts empty with the default grid', () => {
    const draft = createEmptyDraft();
    expect(draft.mapModelId).toBeNull();
    expect(draft.gridWidth).toBe(DEFAULT_GRID_SIZE);
    expect(draft.gridHeight).toBe(DEFAULT_GRID_SIZE);
    expect(draft.image).toBeNull();
  });

  it('copies the model and uses the campaign map name when opened from a campaign', () => {
    const map = { mapId: 3, campaignId: 5, name: 'Taverna 1' } as MapInfo;
    const draft = draftFromMapModel(model, map);
    expect(draft).toMatchObject({ mapModelId: 7, mapId: 3, campaignId: 5, ownerUserId: 1, name: 'Taverna 1', modelName: 'Taverna' });
    expect(draft).toMatchObject({ gridWidth: 12, gridHeight: 9, imageWidth: 1600, imageHeight: 1200, imageTop: 10, imageLeft: 20 });
  });

  it('is dirty only when a saved field changes', () => {
    const saved = draftFromMapModel(model);
    expect(isSameDraft(saved, { ...saved, name: 'Outro nome', imageUrl: 'https://renewed' })).toBe(true);
    expect(isSameDraft(saved, { ...saved, gridWidth: 13 })).toBe(false);
    expect(isSameDraft(saved, { ...saved, imageLeft: 0 })).toBe(false);
    expect(isSameDraft(saved, { ...saved, image: 'other.png' })).toBe(false);
  });

  it('builds the save payload with every layout field', () => {
    expect(toMapModelInsert(draftFromMapModel(model), 'Nova', null)).toEqual({
      name: 'Nova', description: null, image: 'abc.png', gridWidth: 12, gridHeight: 9,
      imageWidth: 1600, imageHeight: 1200, imageTop: 10, imageLeft: 20,
    });
  });
});
