import { describe, expect, it } from 'vitest';
import { createEmptyDraft, DEFAULT_GRID_SIZE, draftFromMapModel, isSameDraft, toMapModelInsert } from './draft';
import type { MapModelInfo } from '../types/mapModel';
import type { MapInfo } from '../types/map';

const model: MapModelInfo = {
  mapModelId: 7, userId: 1, name: 'Taverna', description: 'Salão', image: 'abc.png', imageUrl: 'https://x/abc.png',
  gridWidth: 12, gridHeight: 9, imageWidth: 1600, imageHeight: 1200, imageTop: 10, imageLeft: 20, hexSize: 60,
  maskImage: null, maskImageUrl: null, backgroundImage: null, backgroundImageUrl: null,
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
      imageWidth: 1600, imageHeight: 1200, imageTop: 10, imageLeft: 20, maskImage: null, backgroundImage: null,
    });
  });

  // 034 — 3D view images
  it('starts without a 3D mask or background', () => {
    expect(createEmptyDraft()).toMatchObject({ maskImage: null, maskImageUrl: null, backgroundImage: null, backgroundImageUrl: null });
  });

  it('reads the mask and the background from the model', () => {
    const draft = draftFromMapModel({
      ...model, maskImage: 'mask.png', maskImageUrl: 'https://x/mask.png', backgroundImage: 'sky.jpg', backgroundImageUrl: 'https://x/sky.jpg',
    });

    expect(draft).toMatchObject({
      maskImage: 'mask.png', maskImageUrl: 'https://x/mask.png', backgroundImage: 'sky.jpg', backgroundImageUrl: 'https://x/sky.jpg',
    });
  });

  it('is dirty when the mask or the background change, but not their URLs alone', () => {
    const saved = draftFromMapModel({ ...model, maskImage: 'mask.png', backgroundImage: 'sky.jpg' });

    expect(isSameDraft(saved, { ...saved, maskImage: null })).toBe(false);
    expect(isSameDraft(saved, { ...saved, backgroundImage: 'other.jpg' })).toBe(false);
    expect(isSameDraft(saved, { ...saved, maskImageUrl: 'https://renewed', backgroundImageUrl: 'https://renewed' })).toBe(true);
  });

  it('sends the mask and the background in the save payload', () => {
    const draft = { ...draftFromMapModel(model), maskImage: 'mask.png', backgroundImage: 'sky.jpg' };

    expect(toMapModelInsert(draft, 'Nova', null)).toMatchObject({ maskImage: 'mask.png', backgroundImage: 'sky.jpg' });
  });
});
