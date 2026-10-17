import { ALLOWED_SPACES } from './hexGrid';
import { MODEL_SCALE } from './modelScale';
import { EMPTY_VIEWS } from './spriteView';
import type { ViewImages } from './spriteView';
import type { TokenInfo, TokenInsertInfo } from '../types/token';
import type { TokenWeaponWrite } from '../types/weapon';

/** The 3D model the form resolved on save (055/056): the stored `.glb` and the animation chosen for each state. */
export interface ResolvedModel {
  modelFile: string | null;
  /** `lib/modelAnimations` choices: null = automatic, "none", "clip:{name}" or "animation:{id}". */
  modelIdleClip: string | null;
  modelWalkClip: string | null;
  /** The death (058): played once when a piece of the token is down or out of combat. */
  modelDownClip: string | null;
  /** Size of the model in the 3D view (063), percent; missing = 100. */
  modelScale?: number;
  /** The weapons in the model's hands (082) with their grips; missing/null = empty hand. */
  rightWeapon?: TokenWeaponWrite | null;
  leftWeapon?: TokenWeaponWrite | null;
}

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
  /** 3D model (055): the stored `{guid}.glb` to keep or the one just uploaded, with its chosen animations (056); null = none. */
  model: ResolvedModel | null = null,
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
  modelFile: model?.modelFile ?? null,
  modelIdleClip: model?.modelFile ? model.modelIdleClip : null,
  modelWalkClip: model?.modelFile ? model.modelWalkClip : null,
  modelDownClip: model?.modelFile ? model.modelDownClip : null,
  modelScale: model?.modelFile ? model.modelScale ?? MODEL_SCALE.standard : MODEL_SCALE.standard,
  rightWeapon: model?.modelFile ? model.rightWeapon ?? null : null,
  leftWeapon: model?.modelFile ? model.leftWeapon ?? null : null,
});
