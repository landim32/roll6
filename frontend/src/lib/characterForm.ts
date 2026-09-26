import type { CharacterInsertInfo } from '../types/character';

/** Same limits as the backend Character.Update (Guard.RequiredText / OptionalText / NonNegative). */
export const MAX_CHARACTER_NAME = 260;
export const MAX_CHARACTER_SHEET = 20000;

/** Form values as typed (numbers stay strings until validated). */
export interface CharacterForm {
  name: string;
  life: string;
  energy: string;
  move: string;
  sheet: string;
}

export type CharacterFormError =
  | 'nameRequired' | 'nameTooLong' | 'notInteger' | 'negative' | 'sheetTooLong';

export const emptyCharacterForm = (): CharacterForm => ({ name: '', life: '0', energy: '0', move: '0', sheet: '' });

/** Empty number fields count as 0. */
const toNumber = (value: string): number => (value.trim() === '' ? 0 : Number(value));

export const validateCharacterForm = (form: CharacterForm): CharacterFormError | null => {
  const name = form.name.trim();
  if (!name) return 'nameRequired';
  if (name.length > MAX_CHARACTER_NAME) return 'nameTooLong';
  const numbers = [form.life, form.energy, form.move].map(toNumber);
  if (numbers.some((n) => !Number.isInteger(n))) return 'notInteger';
  if (numbers.some((n) => n < 0)) return 'negative';
  if (form.sheet.length > MAX_CHARACTER_SHEET) return 'sheetTooLong';
  return null;
};

/** Builds the API payload from a valid form (trimmed; empty texts become null). */
export const toCharacterInsert = (form: CharacterForm, image: string | null): CharacterInsertInfo => ({
  name: form.name.trim(),
  life: toNumber(form.life),
  energy: toNumber(form.energy),
  move: toNumber(form.move),
  sheet: form.sheet.trim() ? form.sheet : null,
  image,
});
