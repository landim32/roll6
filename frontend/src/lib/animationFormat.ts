import type { Roll6Clip } from './roll6Clips';

/**
 * The animation file format (059, `roll6-animation` version 1): Roll6's own clips (`lib/roll6Clips`) as a JSON file a
 * user uploads to the library. Mirror of `Domain/Animations/AnimationFormat.cs` and of the `criar-animacao` skill's
 * `validar.py` — same rules, same order, same error keys and messages; the shared cases live in
 * `specs/059-token-animation-library/fixtures/`. Change the three together.
 */
export const ANIMATION_FORMAT = 'roll6-animation';
export const ANIMATION_VERSION = 1;
export const ANIMATION_MAX_BYTES = 1_048_576;
export const ANIMATION_MAX_DURATION = 30;
export const ANIMATION_MAX_TRACKS = 64;
export const ANIMATION_MAX_KEYS = 600;
export const ANIMATION_MAX_DEGREES = 360;
export const ANIMATION_MAX_LIFT = 2;
const TIME_TOLERANCE = 1e-6;

const SIDES = ['Left', 'Right'];
const BODY_SIDE = ['Shoulder', 'Arm', 'ForeArm', 'Hand', 'UpLeg', 'Leg', 'Foot', 'ToeBase'];
const FINGERS = ['Thumb', 'Index', 'Middle', 'Ring', 'Pinky'];

/** The 52 Mixamo bone names (without the `mixamorig:` prefix) an animation file may move. */
export const ANIMATION_BONES: ReadonlySet<string> = new Set([
  'Hips', 'Spine', 'Spine1', 'Spine2', 'Neck', 'Head',
  ...SIDES.flatMap((side) => BODY_SIDE.map((bone) => `${side}${bone}`)),
  ...SIDES.flatMap((side) => FINGERS.flatMap((finger) => [1, 2, 3].map((n) => `${side}Hand${finger}${n}`))),
]);

/** The suggested type a file may carry, in English, in the order of the library's types (1–7). */
export const ANIMATION_TYPE_NAMES = ['idle', 'walk', 'run', 'crouch', 'defeated', 'attack', 'defend'] as const;

export interface AnimationFileTrack {
  bone: string;
  times: number[];
  degrees: [number, number, number][];
}

export interface AnimationFile {
  format: typeof ANIMATION_FORMAT;
  version: typeof ANIMATION_VERSION;
  name?: string;
  type?: string;
  description?: string;
  duration: number;
  loop: boolean;
  tracks: AnimationFileTrack[];
  hipsLift?: { times: number[]; values: number[]; of?: 'height' | 'hips' };
}

export interface AnimationFormatError {
  key: string;
  message: string;
}

export const ANIMATION_MESSAGES = {
  invalidJson: 'O arquivo não é um JSON válido.',
  notObject: 'O conteúdo da animação deve ser um objeto JSON.',
  tooLarge: 'O arquivo de animação passa de 1 MB.',
  format: 'O campo "format" deve ser "roll6-animation".',
  version: 'Versão do formato não suportada (use 1).',
  duration: 'A duração deve ser um número maior que 0 e até 30 segundos.',
  loop: 'O campo "loop" deve ser true ou false.',
  tracks: 'A animação precisa de 1 a 64 trilhas ("tracks").',
  track: (n: number) => `A trilha ${n} deve ser um objeto.`,
  boneMissing: (n: number) => `A trilha ${n} precisa do nome do osso ("bone").`,
  boneUnknown: (bone: string, n: number) => `Osso "${bone}" não existe no esqueleto Mixamo (trilha ${n}).`,
  boneRepeated: (bone: string, n: number) => `O osso "${bone}" aparece em mais de uma trilha (trilha ${n}).`,
  times: (n: number) => `Os instantes da trilha ${n} devem ser de 1 a 600 números, começando em 0, em ordem crescente e até a duração.`,
  degrees: (n: number) => `A trilha ${n} precisa de um giro [x, y, z] por instante, cada valor entre -360 e 360.`,
  hipsLift: 'O campo "hipsLift" deve ser um objeto.',
  liftTimes: 'Os instantes de "hipsLift" devem ser de 1 a 600 números, começando em 0, em ordem crescente e até a duração.',
  liftValues: '"hipsLift" precisa de um valor por instante, cada um entre -2 e 2.',
  liftOf: '"hipsLift.of" deve ser "height" ou "hips".',
} as const;

const isObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const isNumber = (value: unknown): value is number => typeof value === 'number' && Number.isFinite(value);

/** 1–600 finite numbers, the first 0, strictly ascending, the last at most the duration. */
const validTimes = (value: unknown, duration: number): value is number[] => {
  if (!Array.isArray(value) || value.length < 1 || value.length > ANIMATION_MAX_KEYS) return false;
  if (!value.every(isNumber) || value[0] !== 0) return false;
  for (let i = 1; i < value.length; i++) if (value[i] <= value[i - 1]) return false;
  return value[value.length - 1] <= duration + TIME_TOLERANCE;
};

/**
 * The first problem of an animation file, or null when it is valid. `byteLength` is the size of the text it came from
 * (the server measures its own compact copy). Fields the format doesn't know are ignored.
 */
export const validateAnimation = (value: unknown, byteLength?: number): AnimationFormatError | null => {
  const error = (key: string, message: string): AnimationFormatError => ({ key, message });
  if (byteLength !== undefined && byteLength > ANIMATION_MAX_BYTES) return error('content', ANIMATION_MESSAGES.tooLarge);
  if (!isObject(value)) return error('content', ANIMATION_MESSAGES.notObject);
  if (value.format !== ANIMATION_FORMAT) return error('content.format', ANIMATION_MESSAGES.format);
  if (value.version !== ANIMATION_VERSION) return error('content.version', ANIMATION_MESSAGES.version);
  const duration = value.duration;
  if (!isNumber(duration) || duration <= 0 || duration > ANIMATION_MAX_DURATION) return error('content.duration', ANIMATION_MESSAGES.duration);
  if (typeof value.loop !== 'boolean') return error('content.loop', ANIMATION_MESSAGES.loop);
  const tracks = value.tracks;
  if (!Array.isArray(tracks) || tracks.length < 1 || tracks.length > ANIMATION_MAX_TRACKS) return error('content.tracks', ANIMATION_MESSAGES.tracks);

  const seen = new Set<string>();
  for (let i = 0; i < tracks.length; i++) {
    const track = tracks[i];
    const n = i + 1;
    const key = `content.tracks[${i}]`;
    if (!isObject(track)) return error(key, ANIMATION_MESSAGES.track(n));
    const bone = track.bone;
    if (typeof bone !== 'string' || bone === '') return error(`${key}.bone`, ANIMATION_MESSAGES.boneMissing(n));
    if (!ANIMATION_BONES.has(bone)) return error(`${key}.bone`, ANIMATION_MESSAGES.boneUnknown(bone, n));
    if (seen.has(bone)) return error(`${key}.bone`, ANIMATION_MESSAGES.boneRepeated(bone, n));
    seen.add(bone);
    if (!validTimes(track.times, duration)) return error(`${key}.times`, ANIMATION_MESSAGES.times(n));
    const degrees = track.degrees;
    const goodDegrees = Array.isArray(degrees) && degrees.length === track.times.length && degrees.every((triple) =>
      Array.isArray(triple) && triple.length === 3 && triple.every((v) => isNumber(v) && Math.abs(v) <= ANIMATION_MAX_DEGREES));
    if (!goodDegrees) return error(`${key}.degrees`, ANIMATION_MESSAGES.degrees(n));
  }

  if (value.hipsLift !== undefined) {
    const lift = value.hipsLift;
    if (!isObject(lift)) return error('content.hipsLift', ANIMATION_MESSAGES.hipsLift);
    if (!validTimes(lift.times, duration)) return error('content.hipsLift.times', ANIMATION_MESSAGES.liftTimes);
    const values = lift.values;
    if (!Array.isArray(values) || values.length !== lift.times.length || !values.every((v) => isNumber(v) && Math.abs(v) <= ANIMATION_MAX_LIFT))
      return error('content.hipsLift.values', ANIMATION_MESSAGES.liftValues);
    if (lift.of !== undefined && lift.of !== 'height' && lift.of !== 'hips') return error('content.hipsLift.of', ANIMATION_MESSAGES.liftOf);
  }
  return null;
};

/** Reads the text of a `.json` file: the animation, or the first problem (key `content` for broken JSON). */
export const parseAnimationText = (text: string): { file: AnimationFile } | { error: AnimationFormatError } => {
  let value: unknown;
  try {
    value = JSON.parse(text);
  } catch {
    return { error: { key: 'content', message: ANIMATION_MESSAGES.invalidJson } };
  }
  const error = validateAnimation(value, new TextEncoder().encode(text).length);
  return error ? { error } : { file: value as AnimationFile };
};

/** The library type (1–7) a file suggests, or null. */
export const suggestedType = (file: Pick<AnimationFile, 'type'>): number | null => {
  const index = ANIMATION_TYPE_NAMES.indexOf((file.type ?? '') as (typeof ANIMATION_TYPE_NAMES)[number]);
  return index < 0 ? null : index + 1;
};

/**
 * A validated file as a Roll6 clip, played in full (uploaded animations are never fitted to the rig — like the guard and
 * the death of 058). Without `hipsLift` the hips keep their rest height.
 */
export const toRoll6Clip = (file: AnimationFile, name: string): Roll6Clip => ({
  name,
  duration: file.duration,
  tracks: file.tracks.map((track) => ({
    bone: track.bone,
    times: [...track.times],
    degrees: track.degrees.map((triple) => [triple[0], triple[1], triple[2]] as [number, number, number]),
  })),
  hipsLift: file.hipsLift
    ? { times: [...file.hipsLift.times], values: [...file.hipsLift.values], ...(file.hipsLift.of ? { of: file.hipsLift.of } : {}) }
    : { times: [0], values: [0] },
  loop: file.loop,
  protect: false,
});

/** One of Roll6's own clips written as a file (the reference that the format is enough — 059, FR-002). */
export const fromRoll6Clip = (clip: Roll6Clip, extra: { name?: string; type?: string } = {}): AnimationFile => ({
  format: ANIMATION_FORMAT,
  version: ANIMATION_VERSION,
  ...(extra.name ? { name: extra.name } : {}),
  ...(extra.type ? { type: extra.type } : {}),
  duration: clip.duration,
  loop: clip.loop,
  tracks: clip.tracks.map((track) => ({ bone: track.bone, times: [...track.times], degrees: track.degrees.map((t) => [t[0], t[1], t[2]]) })),
  hipsLift: {
    times: [...clip.hipsLift.times],
    values: [...clip.hipsLift.values],
    ...(clip.hipsLift.of === 'hips' ? { of: 'hips' as const } : {}),
  },
});
