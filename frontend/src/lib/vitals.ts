/** Width of a life/energy bar in percent: current ÷ total within 0–100; a zero total is an empty bar. */
export const vitalPercent = (current: number, total: number): number => {
  if (total <= 0) return 0;
  return Math.min(Math.max(current / total, 0), 1) * 100;
};

/** A character at zero or negative life is fallen. */
export const isFallen = (currentLife: number): boolean => currentLife <= 0;

export type VitalsError = 'vitalsNotInteger' | 'aboveTotal';

/**
 * Current values as typed in the form (strings) against the totals: integers (negatives allowed)
 * and never above the total — same rule as the backend's CampaignCharacter.SetVitals.
 */
export const validateVitals = ({ currentLife, currentEnergy, totalLife, totalEnergy }: {
  currentLife: string;
  currentEnergy: string;
  totalLife: number;
  totalEnergy: number;
}): VitalsError | null => {
  const values = [currentLife, currentEnergy].map((v) => (v.trim() === '' ? Number.NaN : Number(v)));
  if (values.some((v) => !Number.isInteger(v))) return 'vitalsNotInteger';
  if (values[0] > totalLife || values[1] > totalEnergy) return 'aboveTotal';
  return null;
};
