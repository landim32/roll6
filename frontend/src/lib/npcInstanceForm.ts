import { POSTURE, POSTURES } from '../types/mapToken';
import type { MapTokenInfo, Posture } from '../types/mapToken';
import type { MapNpcUpdateInfo } from '../types/npc';

/**
 * The form of one NPC instance on the map (051): name, current life/energy, Deslocamento, status and posture — the
 * same limits as the backend MapNpc.Update. Values stay strings until validated, like the other forms.
 */
export const MAX_INSTANCE_NAME = 260;
export const MAX_INSTANCE_STATUS = 260;

export interface InstanceForm {
  name: string;
  currentLife: string;
  currentEnergy: string;
  currentMove: string;
  status: string;
  /** The select's value ("1", "2" or "3"). */
  posture: string;
}

export type InstanceFormError =
  | 'nameRequired' | 'nameTooLong' | 'notInteger' | 'negativeMove' | 'lifeAboveTotal' | 'energyAboveTotal' | 'statusTooLong';

/** Form seeded from the piece of the instance (the piece shows the instance's values). */
export const fromPiece = (piece: MapTokenInfo): InstanceForm => ({
  name: piece.name,
  currentLife: String(piece.life),
  currentEnergy: String(piece.energy),
  currentMove: String(piece.move),
  status: piece.status ?? '',
  posture: String(piece.posture ?? POSTURE.standing),
});

const toNumber = (value: string): number => (value.trim() === '' ? Number.NaN : Number(value));

export const validateInstance = (form: InstanceForm, totals: { totalLife: number; totalEnergy: number }): InstanceFormError | null => {
  const name = form.name.trim();
  if (!name) return 'nameRequired';
  if (name.length > MAX_INSTANCE_NAME) return 'nameTooLong';
  const [life, energy, move] = [form.currentLife, form.currentEnergy, form.currentMove].map(toNumber);
  if (![life, energy, move].every(Number.isInteger)) return 'notInteger';
  if (move < 0) return 'negativeMove';
  if (life > totals.totalLife) return 'lifeAboveTotal';
  if (energy > totals.totalEnergy) return 'energyAboveTotal';
  if (form.status.trim().length > MAX_INSTANCE_STATUS) return 'statusTooLong';
  return null;
};

const toPosture = (value: string): Posture => {
  const posture = Number(value);
  return POSTURES.find((valid) => valid === posture) ?? POSTURE.standing;
};

/** The PUT body of a valid form (trimmed; an empty status becomes null). */
export const toUpdateInfo = (form: InstanceForm): MapNpcUpdateInfo => ({
  name: form.name.trim(),
  currentLife: Number(form.currentLife),
  currentEnergy: Number(form.currentEnergy),
  currentMove: Number(form.currentMove),
  status: form.status.trim() === '' ? null : form.status.trim(),
  posture: toPosture(form.posture),
});
