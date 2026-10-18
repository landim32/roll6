import { Euler, MathUtils, Quaternion } from 'three';
import { ANIMATION_BONES } from '../../../lib/animationFormat';
import type { AnimationFile, AnimationFileTrack } from '../../../lib/animationFormat';
import type { RestFrame } from '../../story/threeClips';
import { POSE_TOLERANCE, poseTimes } from './poses';

/**
 * The pose editor's rules (066): a bone turned on screen back into the degrees of the animation file, and the file with
 * that key set. The file's turn D becomes the local rotation `Q = P⁻¹·(D·C)·P·L` (`threeClips.localRotation`); here
 * `D = P·Q·L⁻¹·P⁻¹·C⁻¹`, with the same rest frame, so a key read back is the key written.
 */

export type Degrees = [number, number, number];

/** Degrees as the files keep them: one decimal, and never "-0". */
const round = (value: number): number => {
  const rounded = Math.round(value * 10) / 10;
  return Object.is(rounded, -0) ? 0 : rounded;
};

/** The file's turn (degrees, XYZ, in the character's frame) that gives the bone of `frame` the local rotation `local`. */
export const degreesFromLocal = (frame: RestFrame, local: Quaternion): Degrees => {
  const turn = frame.parent.clone()
    .multiply(local)
    .multiply(frame.rest.clone().invert())
    .multiply(frame.parent.clone().invert())
    .multiply(frame.correction.clone().invert());
  const euler = new Euler().setFromQuaternion(turn.normalize(), 'XYZ');
  return [round(MathUtils.radToDeg(euler.x)), round(MathUtils.radToDeg(euler.y)), round(MathUtils.radToDeg(euler.z))];
};

/** Two turns are the same when no axis differs by 0.05° or more (a release without turning saves nothing). */
export const sameDegrees = (a: readonly number[], b: readonly number[]): boolean =>
  a.every((value, index) => Math.abs(value - b[index]) < 0.05);

/** The bones an animation file may move (52 Mixamo names): only these can be edited. */
export const isEditableBone = (name: string): boolean => ANIMATION_BONES.has(name);

const keyIndex = (times: readonly number[], time: number, tolerance: number): number =>
  times.findIndex((t) => Math.abs(t - time) <= tolerance);

/** A track with the key of `time` set to `degrees`: replaced when a key is that close, else inserted in order. */
const withKey = (track: AnimationFileTrack, time: number, degrees: Degrees, tolerance: number): AnimationFileTrack => {
  const times = [...track.times];
  const values = track.degrees.map((triple) => [...triple] as Degrees);
  const at = keyIndex(times, time, tolerance);
  if (at >= 0) {
    values[at] = degrees;
  } else {
    let index = 0;
    while (index < times.length && times[index] < time) index++;
    times.splice(index, 0, time);
    values.splice(index, 0, degrees);
  }
  return { ...track, times, degrees: values };
};

/** The rotation a track gives at one of its keys (a key that close to `time`), else null. */
export const keyAt = (file: AnimationFile, bone: string, time: number, tolerance = POSE_TOLERANCE): Degrees | null => {
  const track = file.tracks.find((t) => t.bone === bone);
  if (!track) return null;
  const at = keyIndex(track.times, time, tolerance);
  return at >= 0 ? ([...track.degrees[at]] as Degrees) : null;
};

/**
 * The file with `bone` turned by `degrees` at `time` (066):
 * - a track the bone has gets the key replaced (a key within `tolerance`) or inserted;
 * - a bone without a track gets one with the rest pose (0°) at every other key pose of the file and the new turn at
 *   `time` (Q1 = A: the other poses stay as they were);
 * - in a looping file, a key at one end is copied to the other end when that end has a key (no jump on the loop).
 * Everything else — other tracks, the hips lift, name, type, unknown fields — is copied unchanged.
 */
export const setKey = (file: AnimationFile, bone: string, time: number, degrees: Degrees, tolerance = POSE_TOLERANCE): AnimationFile => {
  const copy = JSON.parse(JSON.stringify(file)) as AnimationFile;
  const key = degrees.map(round) as Degrees;
  const ends: number[] = [time];
  if (copy.loop) {
    if (Math.abs(time) <= tolerance) ends.push(copy.duration);
    else if (Math.abs(time - copy.duration) <= tolerance) ends.push(0);
  }
  const index = copy.tracks.findIndex((t) => t.bone === bone);
  if (index >= 0) {
    let track = copy.tracks[index];
    track = withKey(track, time, key, tolerance);
    // The other end of a loop only follows when it already has a key.
    for (const end of ends.slice(1)) if (keyIndex(track.times, end, tolerance) >= 0) track = withKey(track, end, key, tolerance);
    copy.tracks[index] = track;
  } else {
    const poses = poseTimes(file).filter((t) => Math.abs(t - time) > tolerance);
    const times = [...poses, time].sort((a, b) => a - b);
    const loopEnd = ends.slice(1).find((end) => poses.some((t) => Math.abs(t - end) <= tolerance));
    copy.tracks.push({
      bone,
      times,
      degrees: times.map((t) =>
        Math.abs(t - time) <= tolerance || (loopEnd !== undefined && Math.abs(t - loopEnd) <= tolerance) ? key : ([0, 0, 0] as Degrees)),
    });
  }
  return copy;
};
