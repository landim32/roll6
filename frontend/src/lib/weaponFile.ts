import { checkModelFile } from './modelFile';

/** Same limit as the backend `Weapon.MAX_NAME` (082). */
export const MAX_WEAPON_NAME = 100;

/** Checks a picked weapon `.glb` with the token models' rules (055): the i18n key of the problem, or null. */
export const checkWeaponFile = async (file: Blob & { name?: string }): Promise<string | null> => {
  const check = await checkModelFile(file);
  if (check === 'tooLarge') return 'weapons.fileTooLarge';
  if (check === 'notGlb') return 'weapons.fileNotGlb';
  return null;
};

/** The name a picked file suggests: its file name without `.glb`, cut to the limit. */
export const weaponNameFrom = (fileName: string): string => fileName.replace(/\.glb$/i, '').slice(0, MAX_WEAPON_NAME);
