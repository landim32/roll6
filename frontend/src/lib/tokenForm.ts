import { ALLOWED_SPACES } from './hexGrid';
import { EMPTY_VIEWS } from './spriteView';
import type { ViewImages } from './spriteView';
import type { TokenInfo, TokenInsertInfo } from '../types/token';

/** Same limits as the backend Token.Update. */
export const MAX_TOKEN_NAME = 260;
export const MAX_TOKEN_DESCRIPTION = 2000;
export const DEFAULT_UP_SPACE = 1;
/** A lying image with no chosen space is saved as 2 hexes (Token.DEFAULT_DOWN_SPACE). */
export const DEFAULT_DOWN_SPACE = 2;
/** Sizes a token may take, in hexes (031); same list as the backend. */
export { ALLOWED_SPACES as TOKEN_SPACES } from './hexGrid';

/** Form values as typed (spaces stay strings until validated). */
export interface TokenForm {
  name: string;
  description: string;
  upSpace: string;
  /** Empty = default (2 with a lying image, no lying state otherwise). */
  downSpace: string;
}

export type TokenFormError = 'nameRequired' | 'nameTooLong' | 'descriptionTooLong' | 'invalidSpace';

export const emptyTokenForm = (): TokenForm => ({ name: '', description: '', upSpace: String(DEFAULT_UP_SPACE), downSpace: '' });

/** Form filled with a saved token (edit). */
export const toTokenForm = (token: TokenInfo): TokenForm => ({
  name: token.name,
  description: token.description ?? '',
  upSpace: String(token.upSpace),
  downSpace: token.downSpace === null ? '' : String(token.downSpace),
});

/** Footprint of the lying picture: the chosen space, or 2 when the field stays on the default. */
export const downImageSpace = (downSpace: string): number => {
  const space = Number(downSpace);
  return ALLOWED_SPACES.includes(space) ? space : DEFAULT_DOWN_SPACE;
};

const isSpace = (value: string, optional: boolean): boolean => {
  if (value.trim() === '') return optional;
  return ALLOWED_SPACES.includes(Number(value));
};

export const validateTokenForm = (form: TokenForm): TokenFormError | null => {
  const name = form.name.trim();
  if (!name) return 'nameRequired';
  if (name.length > MAX_TOKEN_NAME) return 'nameTooLong';
  if (form.description.trim().length > MAX_TOKEN_DESCRIPTION) return 'descriptionTooLong';
  if (!isSpace(form.upSpace, false) || !isSpace(form.downSpace, true)) return 'invalidSpace';
  return null;
};

/** API payload from a valid form (trimmed; empty texts and an empty lying space become null). */
export const toTokenInsert = (
  form: TokenForm,
  upImage: string | null,
  downImage: string | null,
  sprites: ViewImages<string> = EMPTY_VIEWS,
): TokenInsertInfo => ({
  name: form.name.trim(),
  description: form.description.trim() || null,
  upSpace: Number(form.upSpace),
  downSpace: form.downSpace.trim() === '' ? null : Number(form.downSpace),
  upImage,
  downImage,
  frontImage: sprites.front,
  rightImage: sprites.right,
  leftImage: sprites.left,
  backImage: sprites.back,
});
