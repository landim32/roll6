/**
 * The default size of a weapon held by a token (082, pure). Weapon files come in any unit (centimetres, metres…), so a
 * weapon starts with its longest side at `DEFAULT_WEAPON_SHARE` of the character's height — never gigantic, never
 * invisible — and the grip's scale (percent) multiplies that.
 */

export const DEFAULT_WEAPON_SHARE = 0.5;

export interface WeaponSize {
  x: number;
  y: number;
  z: number;
}

/**
 * The scale that gives the weapon's longest side `DEFAULT_WEAPON_SHARE` of the character's height, in a holder whose
 * unit is one character height. 1 for an empty or degenerate box.
 */
export const weaponBaseScale = (size: WeaponSize): number => {
  const longest = Math.max(size.x, size.y, size.z);
  if (!Number.isFinite(longest) || longest <= 1e-9) return 1;
  return DEFAULT_WEAPON_SHARE / longest;
};
