import { describe, expect, it } from 'vitest';
import { actionTarget } from './chatComposer';

describe('080: actionTarget', () => {
  it('acts through the piece when the character has one on the open map', () => {
    expect(actionTarget(7, { characterId: 80 }, { mapTokenId: 42 })).toEqual({ mapTokenId: 42 });
  });

  it('acts as the character when it has no piece', () => {
    expect(actionTarget(7, { characterId: 80 }, null)).toEqual({ campaignId: 7, characterId: 80 });
  });

  it('has no target without a character or a campaign', () => {
    expect(actionTarget(7, null, null)).toBeNull();
    expect(actionTarget(null, { characterId: 80 }, null)).toBeNull();
  });
});
