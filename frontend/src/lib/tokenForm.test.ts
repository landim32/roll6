import { describe, expect, it } from 'vitest';
import { downImageSpace, emptyTokenForm, MAX_TOKEN_DESCRIPTION, MAX_TOKEN_NAME, toTokenForm, toTokenInsert, validateTokenForm } from './tokenForm';
import type { TokenInfo } from '../types/token';

const form = (changes = {}) => ({ ...emptyTokenForm(), name: 'Goblin', ...changes });

describe('downImageSpace', () => {
  it('uses 2 when the lying space is left on the default', () => {
    expect(downImageSpace('')).toBe(2);
    expect(downImageSpace('3')).toBe(3);
  });
});

describe('validateTokenForm', () => {
  it.each([
    [{ name: '  ' }, 'nameRequired'],
    [{ name: 'a'.repeat(MAX_TOKEN_NAME + 1) }, 'nameTooLong'],
    [{ description: 'a'.repeat(MAX_TOKEN_DESCRIPTION + 1) }, 'descriptionTooLong'],
    [{ upSpace: '' }, 'invalidSpace'],
    [{ upSpace: '1.5' }, 'invalidSpace'],
    [{ downSpace: '-1' }, 'invalidSpace'],
    [{ upSpace: '0' }, 'invalidSpace'],
    [{ upSpace: '4' }, 'invalidSpace'],
    [{ downSpace: '5' }, 'invalidSpace'],
  ])('rejects %j with %s', (changes, error) => {
    expect(validateTokenForm(form(changes))).toBe(error);
  });

  it('accepts the defaults (lying space optional)', () => {
    expect(validateTokenForm(form())).toBeNull();
  });
});

describe('toTokenInsert', () => {
  it('trims texts, converts spaces and keeps the images', () => {
    expect(toTokenInsert(form({ name: ' Goblin ', description: '  ', upSpace: '1', downSpace: '' }), 'a.png', null)).toEqual({
      name: 'Goblin', description: null, upSpace: 1, downSpace: null, upImage: 'a.png', downImage: null,
      frontImage: null, rightImage: null, leftImage: null, backImage: null,
    });
    expect(toTokenInsert(form({ downSpace: '2' }), null, 'b.png').downSpace).toBe(2);
  });

  it('sends the "2,5D frente" image when there is one (034)', () => {
    expect(toTokenInsert(form(), 'a.png', null, { front: 'front.png', right: null, left: null, back: null }).frontImage).toBe('front.png');
    expect(toTokenInsert(form(), 'a.png', null).frontImage).toBeNull();
  });

  it('sends the four "2,5D" images of the sprites block (035)', () => {
    expect(toTokenInsert(form(), 'a.png', null, { front: 'f.png', right: 'r.png', left: 'l.png', back: 'b.png' })).toMatchObject({
      frontImage: 'f.png', rightImage: 'r.png', leftImage: 'l.png', backImage: 'b.png',
    });
  });

  it('without the sprites block the four images are null', () => {
    expect(toTokenInsert(form(), 'a.png', null)).toMatchObject({
      frontImage: null, rightImage: null, leftImage: null, backImage: null,
    });
  });
});

describe('toTokenForm', () => {
  const token = (changes: Partial<TokenInfo> = {}): TokenInfo => ({
    tokenId: 1, userId: 1, name: 'Goblin', description: null, upSpace: 1, downSpace: null,
    upImage: null, downImage: null, frontImage: null, upImageUrl: null, downImageUrl: null, frontImageUrl: null,
    rightImage: null, rightImageUrl: null, leftImage: null, leftImageUrl: null, backImage: null, backImageUrl: null,
    createdAt: '', updatedAt: '', ...changes,
  });

  it('fills the form with the saved values', () => {
    expect(toTokenForm(token({ description: 'Verde', upSpace: 2, downSpace: 3 }))).toEqual({
      name: 'Goblin', description: 'Verde', upSpace: '2', downSpace: '3',
    });
  });

  it('leaves missing description and lying space empty', () => {
    expect(toTokenForm(token())).toEqual({ name: 'Goblin', description: '', upSpace: '1', downSpace: '' });
  });
});
