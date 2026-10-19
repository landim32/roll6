import { describe, expect, it } from 'vitest';
import { Bone, Group, Vector3 } from 'three';
import type { AnimationFile } from '../../../lib/animationFormat';
import { Player, cameraAngles, clampTime, formatTime, NO_PLAYBACK, nextPlayback } from './player';

describe('editor player (086, from 062)', () => {
  it('keeps a time inside the duration', () => {
    expect(clampTime(2.5, 1.4)).toBe(1.4);
    expect(clampTime(-1, 3)).toBe(0);
    expect(clampTime(0.7, 3)).toBe(0.7);
  });

  it('writes times with one decimal and a comma', () => {
    expect(formatTime(1.2)).toBe('1,2 s');
    expect(formatTime(3)).toBe('3,0 s');
    expect(formatTime(0.06)).toBe('0,1 s');
  });

  it('the same file changed goes on from the same instant, playing or paused (FR-008)', () => {
    const paused = { time: 0.8, duration: 1.2, paused: true, enabled: true };
    expect(nextPlayback(paused, 2, true)).toEqual({ time: 0.8, duration: 2, paused: true, enabled: true });
    // A shorter version keeps the instant inside it.
    expect(nextPlayback({ ...paused, paused: false }, 0.5, true)).toEqual({ time: 0.5, duration: 0.5, paused: false, enabled: true });
  });

  it('another file starts at 0, playing; so does the first one', () => {
    const paused = { time: 0.8, duration: 1.2, paused: true, enabled: true };
    expect(nextPlayback(paused, 3, false)).toEqual({ time: 0, duration: 3, paused: false, enabled: true });
    expect(nextPlayback(NO_PLAYBACK, 1, true)).toEqual({ time: 0, duration: 1, paused: false, enabled: true });
  });

  it('starts with the bar disabled', () => {
    expect(NO_PLAYBACK.enabled).toBe(false);
  });
});

describe('cameraAngles', () => {
  const target = { x: 0, y: 1, z: 0 };

  it('is 0/0 straight in front of the character', () => {
    expect(cameraAngles({ x: 0, y: 1, z: 5 }, target)).toEqual({ azimuth: 0, elevation: 0 });
  });

  it('is positive on the character\'s left (+X) and above', () => {
    const { azimuth, elevation } = cameraAngles({ x: 5, y: 6, z: 0 }, target);
    expect(azimuth).toBeCloseTo(90);
    expect(elevation).toBeCloseTo(45);
  });

  it('is ±180 behind', () => {
    expect(Math.abs(cameraAngles({ x: 0, y: 1, z: -5 }, target).azimuth)).toBeCloseTo(180);
  });
});

describe('Player.refresh', () => {
  /** A Mixamo-named rig: the upper arm starts in the T-pose and every Roll6 clip relaxes it (`RELAXED_ARMS`). */
  const rig = () => {
    const root = new Group();
    const hips = new Bone(); hips.name = 'mixamorigHips'; hips.position.set(0, 1, 0);
    const spine = new Bone(); spine.name = 'mixamorigSpine'; spine.position.set(0, 0.2, 0);
    const arm = new Bone(); arm.name = 'mixamorigLeftArm'; arm.position.set(0.2, 0.3, 0);
    arm.quaternion.setFromAxisAngle(new Vector3(0, 0, 1), -Math.PI / 2);
    const fore = new Bone(); fore.name = 'mixamorigLeftForeArm'; fore.position.set(0, 0.3, 0);
    root.add(hips); hips.add(spine); spine.add(arm); arm.add(fore);
    root.updateMatrixWorld(true);
    return { root, spine };
  };
  const still: AnimationFile = { format: 'roll6-animation', version: 1, duration: 1, loop: true, tracks: [{ bone: 'Spine', times: [0, 1], degrees: [[20, 0, 0], [20, 0, 0]] }] };

  it('puts a still pose back after something else posed the model (the T-pose on load)', () => {
    const { root, spine } = rig();
    const rest = spine.quaternion.clone();
    const player = new Player(root, root, 1.8);
    expect(player.setAnimation(still, 'still', false)).toBeNull();
    const posed = spine.quaternion.clone();
    expect(posed.angleTo(rest)).toBeGreaterThan(0.1);
    // What the sockets' measuring does on load (092): every node back to rest, then the player is asked to re-pose.
    player.restPose();
    expect(spine.quaternion.angleTo(rest)).toBeLessThan(1e-3);
    player.refresh();
    expect(spine.quaternion.angleTo(posed)).toBeLessThan(1e-3);
    expect(player.playback()).toMatchObject({ paused: false, enabled: true });
  });

  it('keeps the instant and the pause, and leaves a held bone alone', () => {
    const { root, spine } = rig();
    const player = new Player(root, root, 1.8);
    player.setAnimation(still, 'still', false);
    player.seek(0.4);
    player.restPose();
    player.refresh();
    expect(player.playback()).toMatchObject({ time: 0.4, paused: true });
    const posed = spine.quaternion.clone();
    player.freeze();
    player.restPose();
    player.refresh();
    expect(spine.quaternion.angleTo(posed)).toBeGreaterThan(0.1);
  });
});
