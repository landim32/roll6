import { describe, expect, it } from 'vitest';
import { emptyTokenForm, MAX_TOKEN_DESCRIPTION, MAX_TOKEN_NAME, toTokenForm, toTokenInsert, validateTokenForm } from './tokenForm';
import type { TokenInfo } from '../types/token';

const form = (changes = {}) => ({ ...emptyTokenForm(), name: 'Goblin', ...changes });

describe('validateTokenForm', () => {
  it.each([
    [{ name: '  ' }, 'nameRequired'],
    [{ name: 'a'.repeat(MAX_TOKEN_NAME + 1) }, 'nameTooLong'],
    [{ description: 'a'.repeat(MAX_TOKEN_DESCRIPTION + 1) }, 'descriptionTooLong'],
    [{ upSpace: '' }, 'invalidSpace'],
    [{ upSpace: '1.5' }, 'invalidSpace'],
    [{ downSpace: '-1' }, 'invalidSpace'],
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
    });
    expect(toTokenInsert(form({ downSpace: '2' }), null, 'b.png').downSpace).toBe(2);
  });
});

describe('toTokenForm', () => {
  const token = (changes: Partial<TokenInfo> = {}): TokenInfo => ({
    tokenId: 1, userId: 1, name: 'Goblin', description: null, upSpace: 1, downSpace: null,
    upImage: null, downImage: null, upImageUrl: null, downImageUrl: null, createdAt: '', updatedAt: '', ...changes,
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
