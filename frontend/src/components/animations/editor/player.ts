import { AnimationMixer, LoopOnce, LoopRepeat } from 'three';
import type { AnimationAction, Object3D } from 'three';
import { toRoll6Clip } from '../../../lib/animationFormat';
import type { AnimationFile } from '../../../lib/animationFormat';
import { buildRoll6Clip } from '../../story/threeClips';

/** Where the animation is, for the time bar (062, contracts/viewer-bridge.md). */
export interface Playback {
  time: number;
  duration: number;
  paused: boolean;
  /** False when there is no animation: the bar is disabled. */
  enabled: boolean;
}

/**
 * Where the camera is around the character, in degrees (062, print of the view): `azimuth` 0 = in front (glTF +Z),
 * positive toward the character's left (+X), ±180 behind; `elevation` above the point it looks at.
 */
export const cameraAngles = (
  camera: { x: number; y: number; z: number },
  target: { x: number; y: number; z: number },
): { azimuth: number; elevation: number } => {
  const dx = camera.x - target.x;
  const dy = camera.y - target.y;
  const dz = camera.z - target.z;
  const toDegrees = (radians: number) => (radians * 180) / Math.PI;
  return { azimuth: toDegrees(Math.atan2(dx, dz)), elevation: toDegrees(Math.atan2(dy, Math.hypot(dx, dz))) };
};

/** The time bar's state before any animation. */
export const NO_PLAYBACK: Playback = { time: 0, duration: 0, paused: true, enabled: false };

/** A time kept inside a (new) duration. */
export const clampTime = (time: number, duration: number): number => Math.min(Math.max(0, time), Math.max(0, duration));

/** "1,2 s" — one decimal, Brazilian comma. */
export const formatTime = (seconds: number): string => `${(Math.round(seconds * 10) / 10).toFixed(1).replace('.', ',')} s`;

/**
 * The playback right after a new animation arrives (FR-008): the same file changed (`keepTime`) goes on from the same
 * instant — kept inside the new duration — and keeps playing or paused; another file starts at 0, playing.
 */
export const nextPlayback = (current: Playback, duration: number, keepTime: boolean): Playback =>
  keepTime && current.enabled
    ? { time: clampTime(current.time, duration), duration, paused: current.paused, enabled: true }
    : { time: 0, duration, paused: false, enabled: true };

/**
 * Plays one `roll6-animation` file on the open model with the Roll6's own converter (`buildRoll6Clip`, research R2),
 * so a pose here is the pose on the table. A file that does not loop plays once and rests on its last frame.
 */
export class Player {
  private readonly mixer: AnimationMixer;
  private action: AnimationAction | null = null;
  private state: Playback = NO_PLAYBACK;
  /** Every node's transform as loaded: the rest pose `clear` goes back to. */
  private readonly rest: { node: Object3D; position: Object3D['position']; quaternion: Object3D['quaternion']; scale: Object3D['scale'] }[] = [];

  /**
   * @param model the instance on screen.
   * @param source the asset's scene the clips are built on, as the Roll6 does (same bone names as `model`).
   * @param height the model's height in its own units (the unit of `hipsLift`).
   */
  /** The asset's scene, at rest: the clips are built on it, and the pose editor (066) reads the rest frames there. */
  readonly source: Object3D;
  /** The pose editor holds a bone (066): the mixer must not put the clip's pose back over it. */
  private frozen = false;
  private readonly height: number;

  constructor(model: Object3D, source: Object3D, height: number) {
    this.source = source;
    this.height = height;
    this.mixer = new AnimationMixer(model);
    model.traverse((node) => {
      if (node !== model) {
        this.rest.push({ node, position: node.position.clone(), quaternion: node.quaternion.clone(), scale: node.scale.clone() });
      }
    });
  }

  /** Builds and plays `file`; returns an error text when the model has none of its bones. */
  setAnimation(file: AnimationFile, fileName: string, keepTime: boolean): string | null {
    this.frozen = false;
    const clip = buildRoll6Clip(toRoll6Clip(file, `animation:${fileName}`), this.source, this.height);
    if (!clip) return 'O modelo não tem nenhum dos ossos desta animação.';
    const next = nextPlayback(this.state, clip.duration, keepTime);
    this.mixer.stopAllAction();
    if (this.action) this.mixer.uncacheAction(this.action.getClip());
    const action = this.mixer.clipAction(clip);
    action.setLoop(file.loop ? LoopRepeat : LoopOnce, file.loop ? Infinity : 1);
    action.clampWhenFinished = !file.loop;
    action.play();
    action.time = next.time;
    action.paused = next.paused;
    this.mixer.update(0);
    this.action = action;
    this.state = next;
    return null;
  }

  /** No animation: the model back in its rest pose, the bar disabled. */
  clear(): void {
    this.frozen = false;
    this.mixer.stopAllAction();
    this.action = null;
    this.state = NO_PLAYBACK;
    for (const { node, position, quaternion, scale } of this.rest) {
      node.position.copy(position);
      node.quaternion.copy(quaternion);
      node.scale.copy(scale);
    }
  }

  play(): void {
    const action = this.action;
    if (!action) return;
    // A clip played once that reached its end starts over.
    if (action.loop === LoopOnce && action.time >= action.getClip().duration - 1e-4) {
      action.reset().play();
    }
    action.paused = false;
  }

  pause(): void {
    if (this.action) this.action.paused = true;
  }

  /** Shows the pose of `seconds` at once and stays paused (FR-003). */
  seek(seconds: number): void {
    const action = this.action;
    if (!action) return;
    action.paused = true;
    action.enabled = true;
    action.time = clampTime(seconds, action.getClip().duration);
    this.mixer.update(0);
  }

  /** Stops the mixer from posing the model until the next animation, `clear` or `thaw` (066). */
  freeze(): void {
    this.frozen = true;
  }

  /** Lets the mixer pose the model again, at the instant it was (the clip's pose comes back). */
  thaw(): void {
    if (!this.frozen) return;
    this.frozen = false;
    this.mixer.update(0);
  }

  update(delta: number): void {
    if (this.frozen) return;
    this.mixer.update(delta);
  }

  playback(): Playback {
    const action = this.action;
    if (!action) return NO_PLAYBACK;
    const duration = action.getClip().duration;
    const ended = action.loop === LoopOnce && action.time >= duration - 1e-4;
    this.state = { time: clampTime(action.time, duration), duration, paused: action.paused || ended, enabled: true };
    return this.state;
  }
}
