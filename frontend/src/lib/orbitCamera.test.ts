import { describe, expect, it } from 'vitest';
import { DRAG_TURN, easeBack, foldIntoCharacter, normalizeOrbit, orbitBy, orbitPose } from './orbitCamera';
import { FOLLOW_DISTANCE, followPose, forwardOf } from './storyCamera';
import { startWalker, walkCamera } from './walker';

const open = () => false;
const target = { x: 400, y: 400 };

describe('orbit angles', () => {
  it('keeps the orbit in (−π, π]', () => {
    expect(normalizeOrbit(0)).toBe(0);
    expect(normalizeOrbit(Math.PI)).toBeCloseTo(Math.PI);
    expect(normalizeOrbit(-Math.PI)).toBeCloseTo(Math.PI);
    expect(normalizeOrbit(3 * Math.PI / 2)).toBeCloseTo(-Math.PI / 2);
    expect(normalizeOrbit(-5 * Math.PI / 2)).toBeCloseTo(-Math.PI / 2);
  });

  it('turns the drag into an angle around the character', () => {
    expect(orbitBy(0, 100)).toBeCloseTo(100 * DRAG_TURN);
    expect(orbitBy(0.2, -40)).toBeCloseTo(0.2 - 40 * DRAG_TURN);
  });

  it('folds the orbit into the character on a right drag', () => {
    expect(foldIntoCharacter(1, 0.5)).toEqual({ yaw: 1.5, orbit: 0 });
  });
});

describe('easeBack', () => {
  it('brings 180° back behind the character within a second, smoothly, and snaps to exactly 0', () => {
    let orbit = Math.PI;
    let previous = orbit;
    let frames = 0;
    while (orbit !== 0) {
      orbit = easeBack(orbit, 1 / 60);
      expect(Math.abs(orbit)).toBeLessThan(Math.abs(previous));
      previous = orbit;
      frames++;
      expect(frames).toBeLessThan(1000);
    }
    expect(frames / 60).toBeLessThanOrEqual(1);
    expect(frames / 60).toBeGreaterThan(0.3);
  });

  it('works the same for the other side and leaves 0 alone', () => {
    expect(easeBack(-1, 0.1)).toBeCloseTo(-easeBack(1, 0.1));
    expect(easeBack(0, 0.1)).toBe(0);
  });
});

describe('orbitPose', () => {
  it('is the camera behind the character at orbit 0', () => {
    const pose = orbitPose(target, 0, 0, 100, open);
    expect(pose.x).toBeCloseTo(400);
    expect(pose.z).toBeCloseTo(500);
    expect(pose.yaw).toBe(0);
    expect(pose.attached).toBe(true);
  });

  it('looks at the face from in front at orbit π', () => {
    const pose = orbitPose(target, 0, Math.PI, 100, open);
    // The character faces north (−y); the camera stands north of it, looking south at it.
    expect(pose.x).toBeCloseTo(400);
    expect(pose.z).toBeCloseTo(300);
    expect(pose.yaw).toBeCloseTo(Math.PI);
    const ahead = forwardOf(pose.yaw);
    expect(pose.x + ahead.x * 100).toBeCloseTo(target.x);
    expect(pose.z + ahead.y * 100).toBeCloseTo(target.y);
  });

  it('comes closer in front of a wall instead of passing it', () => {
    const wall = (_x: number, z: number) => z < 340;
    const pose = orbitPose(target, 0, Math.PI, 100, wall);
    expect(pose.z).toBeGreaterThanOrEqual(340);
    expect(pose.z).toBeLessThan(400);
  });

  it('keeps followPose and walkCamera as before at orbit 0, and orbits them otherwise', () => {
    expect(followPose(target, 0, open)).toEqual(orbitPose(target, 0, 0, FOLLOW_DISTANCE, open));
    const walker = startWalker(target, 0);
    expect(walkCamera(walker, open)).toEqual(orbitPose(target, 0, 0, walker.distance, open));
    expect(walkCamera(walker, open, Math.PI).z).toBeLessThan(target.y);
    expect(followPose(target, 0, open, Math.PI / 2).x).toBeLessThan(target.x);
  });
});
