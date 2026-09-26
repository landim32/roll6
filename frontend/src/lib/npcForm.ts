import type { NpcInfo, NpcInsertInfo } from '../types/npc';

/** Same limits as the backend Npc.Update. */
export const MAX_NPC_NAME = 260;
export const MAX_NPC_SHEET = 20000;

/** Form values as typed (numbers stay strings until validated). */
export interface NpcForm {
  name: string;
  life: string;
  energy: string;
  move: string;
  sheet: string;
}

export type NpcFormError = 'nameRequired' | 'nameTooLong' | 'notInteger' | 'negative' | 'sheetTooLong' | 'tokenRequired';

export const emptyNpcForm = (): NpcForm => ({ name: '', life: '0', energy: '0', move: '0', sheet: '' });

/** Form filled with a saved NPC (edit). */
export const toNpcForm = (npc: NpcInfo): NpcForm => ({
  name: npc.name,
  life: String(npc.life),
  energy: String(npc.energy),
  move: String(npc.move),
  sheet: npc.sheet ?? '',
});

/** Empty number fields count as 0. */
const toNumber = (value: string): number => (value.trim() === '' ? 0 : Number(value));

export const validateNpcForm = (form: NpcForm, tokenId: number | null): NpcFormError | null => {
  const name = form.name.trim();
  if (!name) return 'nameRequired';
  if (name.length > MAX_NPC_NAME) return 'nameTooLong';
  const numbers = [form.life, form.energy, form.move].map(toNumber);
  if (numbers.some((n) => !Number.isInteger(n))) return 'notInteger';
  if (numbers.some((n) => n < 0)) return 'negative';
  if (form.sheet.length > MAX_NPC_SHEET) return 'sheetTooLong';
  if (tokenId === null) return 'tokenRequired';
  return null;
};

/** API payload from a valid form (trimmed; empty texts become null). */
export const toNpcInsert = (form: NpcForm, image: string | null, tokenId: number): NpcInsertInfo => ({
  tokenId,
  name: form.name.trim(),
  life: toNumber(form.life),
  energy: toNumber(form.energy),
  move: toNumber(form.move),
  sheet: form.sheet.trim() ? form.sheet : null,
  image,
});
