import type { Object3D } from 'three';
import { storedModelName } from '../../lib/modelFile';
import { sameGrip } from '../../lib/weaponGrip';
import { HANDS } from '../../types/weapon';
import type { Hand, HandWeapons } from '../../types/weapon';
import { attachWeapons, gripGroupOf, placeGrip } from './attachWeapons';
import type { HeldWeapon } from './attachWeapons';
import { cloneWeapon, loadWeapon } from './loadWeapon';

/** A weapon file's identity: its stored name (presigned URLs change on every read), else the URL itself. */
export const weaponKey = (url: string): string => storedModelName(url) ?? url;

export const sameHandWeapons = (a: HandWeapons | undefined, b: HandWeapons | undefined): boolean =>
  HANDS.every((hand) => {
    const x = a?.[hand];
    const y = b?.[hand];
    if (!x || !y) return !x && !y;
    return weaponKey(x.url) === weaponKey(y.url) && sameGrip(x.grip, y.grip);
  });

interface Held extends HeldWeapon {
  /** `weaponKey` of its file. */
  url: string;
}

export interface WeaponHandsSync {
  /**
   * Makes the model hold `wanted`: a new file loads that weapon (once per URL) and attaches it when it arrives, a grip
   * alone only re-places the weapon, an empty hand detaches it. `characterHeight` is the model's height in its own units.
   */
  sync: (model: Object3D, characterHeight: number, wanted: HandWeapons | undefined) => void;
  /** Forgets the held weapons (the model was removed or replaced). */
  reset: () => void;
}

/**
 * Keeps one model's weapons in step with what its token asks for (082), shared by the 3D view (`modelSet`) and the
 * token preview. `onChange` runs after the weapons changed on the model (to redraw, or to apply shadows).
 */
export const createWeaponHands = (onChange: (model: Object3D) => void): WeaponHandsSync => {
  let held: Partial<Record<Hand, Held>> = {};
  /** The latest request per hand: a weapon arriving for anything else (or after a reset) is dropped. */
  let latest: HandWeapons = {};
  /** Increases on every reset (the model was replaced). */
  let generation = 0;

  const attach = (model: Object3D, characterHeight: number) => {
    attachWeapons(model, held, characterHeight);
    onChange(model);
  };

  return {
    sync: (model, characterHeight, wanted) => {
      latest = { ...wanted };
      const current = generation;
      let reattach = false;
      for (const hand of HANDS) {
        const want = wanted?.[hand];
        const have = held[hand];
        if (!want) {
          if (have) {
            delete held[hand];
            reattach = true;
          }
          continue;
        }
        if (have && have.url === weaponKey(want.url)) {
          if (!sameGrip(have.grip, want.grip)) {
            have.grip = want.grip;
            const group = gripGroupOf(model, hand);
            if (group) placeGrip(group, have);
            onChange(model);
          }
          continue;
        }
        if (have) {
          delete held[hand];
          reattach = true;
        }
        void loadWeapon(want.url).then((asset) => {
          // Only the latest request for this hand counts (with its latest grip); a failed weapon simply leaves the hand
          // empty (FR-019).
          const still = latest[hand];
          const key = weaponKey(want.url);
          if (!asset || current !== generation || !still || weaponKey(still.url) !== key || held[hand]?.url === key) return;
          held[hand] = { url: key, grip: still.grip, size: asset.size, object: cloneWeapon(asset) };
          attach(model, characterHeight);
        });
      }
      if (reattach) attach(model, characterHeight);
    },
    reset: () => {
      generation += 1;
      held = {};
      latest = {};
    },
  };
};
