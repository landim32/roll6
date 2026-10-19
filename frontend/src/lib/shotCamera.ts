import type { ShotView } from '../types/animationEditor';

/**
 * Where the camera stands for a print the Claude asked for (094, research R5), around the character on the editor's
 * stage. Angles use the stage's own convention (`player.cameraAngles`): azimuth 0° = in front (glTF +Z), positive toward
 * the character's left (+X), ±180° behind; elevation above the point the camera looks at. Pure, so the stage and the
 * caption agree on every side.
 */

export interface ShotAngles {
  azimuth: number;
  elevation: number;
}

export const SHOT_ANGLES: Record<ShotView, ShotAngles> = {
  front: { azimuth: 0, elevation: 10 },
  back: { azimuth: 180, elevation: 10 },
  // The character's own right is the −X side: the camera stands there looking at it.
  right: { azimuth: -90, elevation: 10 },
  left: { azimuth: 90, elevation: 10 },
  top: { azimuth: 0, elevation: 80 },
  'three-quarter': { azimuth: -35, elevation: 20 },
};

/** The Portuguese name of each side, for the caption. */
export const SHOT_VIEW_LABEL: Record<ShotView, string> = {
  front: 'de frente',
  back: 'de costas',
  right: 'do lado direito do personagem',
  left: 'do lado esquerdo do personagem',
  top: 'de cima',
  'three-quarter': 'em três quartos (frente e lado direito)',
};

export const shotAngles = (view: ShotView): ShotAngles => SHOT_ANGLES[view] ?? SHOT_ANGLES['three-quarter'];

/** The camera position `distance` away from `target` at the view's angles (the inverse of `cameraAngles`). */
export const shotCameraPosition = (
  target: { x: number; y: number; z: number },
  distance: number,
  view: ShotView,
): { x: number; y: number; z: number } => {
  const { azimuth, elevation } = shotAngles(view);
  const a = (azimuth * Math.PI) / 180;
  const e = (elevation * Math.PI) / 180;
  const flat = distance * Math.cos(e);
  return { x: target.x + flat * Math.sin(a), y: target.y + distance * Math.sin(e), z: target.z + flat * Math.cos(a) };
};

/** The instant of a shot: "key" → the key pose, a number kept inside the animation. */
export const shotTime = (time: number | 'key', duration: number, keyTime: number): number =>
  time === 'key' ? keyTime : Math.min(Math.max(0, time), Math.max(0, duration));
