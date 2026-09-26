import { describe, expect, it } from 'vitest';
import {
  emptyCharacterForm, MAX_CHARACTER_NAME, MAX_CHARACTER_SHEET, toCharacterInsert, validateCharacterForm,
} from './characterForm';

const form = (changes = {}) => ({ ...emptyCharacterForm(), name: 'Aria', ...changes });

describe('validateCharacterForm', () => {
  it.each([
    [{ name: '   ' }, 'nameRequired'],
    [{ name: 'a'.repeat(MAX_CHARACTER_NAME + 1) }, 'nameTooLong'],
    [{ life: '1.5' }, 'notInteger'],
    [{ energy: 'abc' }, 'notInteger'],
    [{ move: '-1' }, 'negative'],
    [{ sheet: 'x'.repeat(MAX_CHARACTER_SHEET + 1) }, 'sheetTooLong'],
  ])('rejects %j with %s', (changes, error) => {
    expect(validateCharacterForm(form(changes))).toBe(error);
  });

  it('accepts a valid form, with empty numbers as 0', () => {
    expect(validateCharacterForm(form({ life: '', energy: '10', move: '6' }))).toBeNull();
  });
});

describe('toCharacterInsert', () => {
  it('trims, converts numbers and turns empty texts into null', () => {
    expect(toCharacterInsert(form({ name: ' Aria ', life: '12', energy: '', move: '6', sheet: '' }), null)).toEqual({
      name: 'Aria', life: 12, energy: 0, move: 6, sheet: null, image: null,
    });
  });

  it('keeps the sheet text and the uploaded image', () => {
    const result = toCharacterInsert(form({ sheet: 'Força 3\nDestreza 2' }), 'abc.png');
    expect(result.sheet).toBe('Força 3\nDestreza 2');
    expect(result.image).toBe('abc.png');
  });
});
