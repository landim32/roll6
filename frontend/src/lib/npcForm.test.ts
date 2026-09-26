import { describe, expect, it } from 'vitest';
import { emptyNpcForm, MAX_NPC_NAME, MAX_NPC_SHEET, toNpcForm, toNpcInsert, validateNpcForm } from './npcForm';
import type { NpcInfo } from '../types/npc';

const form = (changes = {}) => ({ ...emptyNpcForm(), name: 'Goblin', ...changes });

describe('validateNpcForm', () => {
  it.each([
    [{ name: '  ' }, 'nameRequired'],
    [{ name: 'a'.repeat(MAX_NPC_NAME + 1) }, 'nameTooLong'],
    [{ life: '1.5' }, 'notInteger'],
    [{ energy: 'abc' }, 'notInteger'],
    [{ move: '-1' }, 'negative'],
    [{ sheet: 'x'.repeat(MAX_NPC_SHEET + 1) }, 'sheetTooLong'],
  ])('rejects %j with %s', (changes, error) => {
    expect(validateNpcForm(form(changes), 5)).toBe(error);
  });

  it('requires a token', () => {
    expect(validateNpcForm(form(), null)).toBe('tokenRequired');
  });

  it('accepts a valid form, with empty numbers as 0', () => {
    expect(validateNpcForm(form({ life: '', energy: '2', move: '6' }), 5)).toBeNull();
  });
});

describe('toNpcInsert / toNpcForm', () => {
  it('builds the payload', () => {
    expect(toNpcInsert(form({ name: ' Goblin ', life: '7', energy: '', move: '6', sheet: ' ' }), null, 5)).toEqual({
      tokenId: 5, name: 'Goblin', life: 7, energy: 0, move: 6, sheet: null, image: null,
    });
  });

  it('fills the form from a saved NPC', () => {
    const npc = { name: 'Goblin', life: 7, energy: 2, move: 6, sheet: null } as NpcInfo;
    expect(toNpcForm(npc)).toEqual({ name: 'Goblin', life: '7', energy: '2', move: '6', sheet: '' });
  });
});
