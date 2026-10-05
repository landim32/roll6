import { describe, expect, it } from 'vitest';
import { emptyNpcForm, MAX_NPC_NAME, MAX_NPC_SHEET, MAX_NPC_STATUS, toNpcForm, toNpcInsert, validateNpcForm } from './npcForm';
import type { NpcInfo } from '../types/npc';

const form = (changes = {}) => ({ ...emptyNpcForm(), name: 'Goblin', ...changes });

describe('validateNpcForm', () => {
  it.each([
    [{ name: '  ' }, 'nameRequired'],
    [{ name: 'a'.repeat(MAX_NPC_NAME + 1) }, 'nameTooLong'],
    [{ life: '1.5' }, 'notInteger'],
    [{ energy: 'abc' }, 'notInteger'],
    [{ move: '-1' }, 'negative'],
    [{ status: 'x'.repeat(MAX_NPC_STATUS + 1) }, 'statusTooLong'],
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
    expect(toNpcInsert(form({ name: ' Goblin ', life: '7', energy: '', move: '6', status: ' ferido ', sheet: ' ' }), null, 5)).toEqual({
      tokenId: 5, name: 'Goblin', life: 7, energy: 0, move: 6, sheet: null, status: 'ferido', posture: 1, image: null,
    });
  });

  it('sends the posture each new occurrence starts with', () => {
    expect(toNpcInsert(form({ posture: '2' }), null, 5).posture).toBe(2);
    expect(toNpcInsert(form({ posture: '3' }), null, 5).posture).toBe(3);
  });

  it('takes anything that is not a posture as standing', () => {
    for (const posture of ['', '0', '4', 'abc', '1.5']) expect(toNpcInsert(form({ posture }), null, 5).posture).toBe(1);
  });

  it('starts standing', () => {
    expect(emptyNpcForm().posture).toBe('1');
  });

  it('fills the form from a saved NPC', () => {
    const npc = { name: 'Goblin', life: 7, energy: 2, move: 6, sheet: null, status: null } as NpcInfo;
    expect(toNpcForm(npc)).toEqual({ name: 'Goblin', life: '7', energy: '2', move: '6', status: '', posture: '1', sheet: '' });
  });

  it('fills the posture from a saved NPC that lies down', () => {
    expect(toNpcForm({ name: 'Goblin', life: 7, energy: 2, move: 6, sheet: null, status: null, posture: 2 } as NpcInfo).posture).toBe('2');
  });
});
