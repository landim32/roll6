import type { Object3D } from 'three';
import { storedModelName } from '../../lib/modelFile';
import { sameGrip } from '../../lib/weaponGrip';
import { sameGripPoint, samePose } from '../../lib/weaponPose';
import { SOCKETS } from '../../types/weapon';
import type { Socket, SocketWeapons } from '../../types/weapon';
import { attachWeapons, placeWeapon } from './attachWeapons';
import type { HeldWeapon } from './attachWeapons';
import { cloneWeapon, loadWeapon } from './loadWeapon';

/** A weapon file's identity: its stored name (presigned URLs change on every read), else the URL itself. */
export const weaponKey = (url: string): string => storedModelName(url) ?? url;

export const sameSocketWeapons = (a: SocketWeapons | undefined, b: SocketWeapons | undefined): boolean =>
  SOCKETS.every((socket) => {
    const x = a?.[socket];
    const y = b?.[socket];
    if (!x || !y) return !x && !y;
    return weaponKey(x.url) === weaponKey(y.url) && sameGripPoint(x.gripPoint, y.gripPoint) && samePose(x.pose, y.pose)
      && sameGrip(x.grip, y.grip);
  });

interface Held extends HeldWeapon {
  /** `weaponKey` of its file. */
  url: string;
}

export interface WeaponSocketsSync {
  /**
   * Makes the model carry `wanted`: a new file loads that weapon (once per URL) and attaches it when it arrives; a changed
   * grip point, pose or grip only re-places the weapon; an empty socket detaches it. `characterHeight` is the model's
   * height in its own units.
   */
  sync: (model: Object3D, characterHeight: number, wanted: SocketWeapons | undefined) => void;
  /** Forgets the carried weapons (the model was removed or replaced). */
  reset: () => void;
}

/**
 * Keeps one model's weapons in step with what its token asks for (082/083), shared by the 3D view (`modelSet`) and the
 * token preview. `onChange` runs after the weapons changed on the model (to redraw, or to apply shadows).
 */
export const createWeaponSockets = (onChange: (model: Object3D) => void): WeaponSocketsSync => {
  let held: Partial<Record<Socket, Held>> = {};
  /** The latest request per socket: a weapon arriving for anything else (or after a reset) is dropped. */
  let latest: SocketWeapons = {};
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
      for (const socket of SOCKETS) {
        const want = wanted?.[socket];
        const have = held[socket];
        if (!want) {
          if (have) {
            delete held[socket];
            reattach = true;
          }
          continue;
        }
        if (have && have.url === weaponKey(want.url)) {
          if (!sameGrip(have.grip, want.grip) || !sameGripPoint(have.gripPoint, want.gripPoint) || !samePose(have.pose, want.pose)) {
            have.grip = want.grip;
            have.gripPoint = want.gripPoint;
            have.pose = want.pose;
            if (placeWeapon(model, socket, have)) onChange(model);
          }
          continue;
        }
        if (have) {
          delete held[socket];
          reattach = true;
        }
        void loadWeapon(want.url).then((asset) => {
          // Only the latest request for this socket counts (with its latest grip); a failed weapon simply leaves the
          // socket empty (FR-018).
          const still = latest[socket];
          const key = weaponKey(want.url);
          if (!asset || current !== generation || !still || weaponKey(still.url) !== key || held[socket]?.url === key) return;
          held[socket] = {
            url: key, grip: still.grip, gripPoint: still.gripPoint, pose: still.pose, size: asset.size, min: asset.min,
            object: cloneWeapon(asset),
          };
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
