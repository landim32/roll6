import { describe, expect, it } from 'vitest';
import { MIXAMO_REQUIRED } from './modelAnimations';
import { RELAXED_ARMS, ROLL6_CLIPS, ROLL6_CLIPS_BY_NAME, ROLL6_GUARD } from './roll6Clips';

/** Every bone name of a Mixamo skeleton these clips may use. */
const MIXAMO_BONES = new Set([
  ...MIXAMO_REQUIRED, 'Spine1', 'Spine2', 'Neck', 'LeftShoulder', 'RightShoulder', 'LeftForeArm', 'RightForeArm',
  'LeftHand', 'RightHand', 'LeftFoot', 'RightFoot', 'LeftToeBase', 'RightToeBase',
]);

describe('Roll6 clips (055)', () => {
  for (const clip of Object.values(ROLL6_CLIPS)) {
    describe(clip.name, () => {
      it('loops: every track ends where it starts, times ascending inside the duration', () => {
        for (const track of [...clip.tracks, { bone: 'Hips', times: clip.hipsLift.times, degrees: clip.hipsLift.values.map((v) => [v, 0, 0]) }]) {
          expect(track.times[0]).toBe(0);
          expect(track.times[track.times.length - 1]).toBe(clip.duration);
          for (let i = 1; i < track.times.length; i++) expect(track.times[i]).toBeGreaterThan(track.times[i - 1]);
          expect(track.degrees).toHaveLength(track.times.length);
          expect(track.degrees[0]).toEqual(track.degrees[track.degrees.length - 1]);
        }
      });

      it('only uses Mixamo bones, each once', () => {
        const bones = clip.tracks.map((track) => track.bone);
        expect(new Set(bones).size).toBe(bones.length);
        for (const bone of bones) expect(MIXAMO_BONES.has(bone)).toBe(true);
      });

      it('keeps every turn within ±40°', () => {
        for (const track of clip.tracks) for (const triple of track.degrees) for (const value of triple) expect(Math.abs(value)).toBeLessThanOrEqual(40);
      });
    });
  }

  it('standing still is gentle: no turn over 10° and a slow breath', () => {
    expect(ROLL6_CLIPS.idle.duration).toBeGreaterThanOrEqual(2);
    for (const track of ROLL6_CLIPS.idle.tracks) for (const triple of track.degrees) for (const value of triple) expect(Math.abs(value)).toBeLessThanOrEqual(10);
  });

  it('walking moves the legs in opposite phase and the arms against them', () => {
    const swing = (bone: string) => ROLL6_CLIPS.walk.tracks.find((track) => track.bone === bone)!.degrees.map((triple) => triple[0]);
    const left = swing('LeftUpLeg');
    const right = swing('RightUpLeg');
    left.forEach((value, i) => expect(value + right[i]).toBe(0));
    const leftArm = swing('LeftArm');
    left.forEach((value, i) => expect(Math.sign(leftArm[i]) === -Math.sign(value)).toBe(true));
  });

  it('hangs the relaxed arms down and out on their own side', () => {
    expect(RELAXED_ARMS.LeftArm[1]).toBeLessThan(0);
    expect(RELAXED_ARMS.RightArm[1]).toBeLessThan(0);
    expect(RELAXED_ARMS.LeftArm[0]).toBeGreaterThan(0);
    expect(RELAXED_ARMS.RightArm[0]).toBeLessThan(0);
  });
});

describe('Roll6 guard stance (057)', () => {
  const track = (bone: string) => ROLL6_GUARD.tracks.find((item) => item.bone === bone)!;

  it('loops: every track ends where it starts, times ascending inside the duration', () => {
    for (const item of [...ROLL6_GUARD.tracks, { bone: 'Hips', times: ROLL6_GUARD.hipsLift.times, degrees: ROLL6_GUARD.hipsLift.values.map((v) => [v, 0, 0]) }]) {
      expect(item.times[0]).toBe(0);
      expect(item.times[item.times.length - 1]).toBe(ROLL6_GUARD.duration);
      for (let i = 1; i < item.times.length; i++) expect(item.times[i]).toBeGreaterThan(item.times[i - 1]);
      expect(item.degrees).toHaveLength(item.times.length);
      expect(item.degrees[0]).toEqual(item.degrees[item.degrees.length - 1]);
    }
  });

  it('only uses Mixamo bones, each once, with turns within ±110°', () => {
    const bones = ROLL6_GUARD.tracks.map((item) => item.bone);
    expect(new Set(bones).size).toBe(bones.length);
    for (const bone of bones) expect(MIXAMO_BONES.has(bone)).toBe(true);
    for (const item of ROLL6_GUARD.tracks) for (const triple of item.degrees) for (const value of triple) expect(Math.abs(value)).toBeLessThanOrEqual(110);
  });

  it('is on guard: knees bent, thighs forward and apart, upper arms raised in front, elbows bent hard', () => {
    for (const bone of ['LeftLeg', 'RightLeg']) for (const [x] of track(bone).degrees) expect(x).toBeGreaterThanOrEqual(25);
    for (const [x] of track('LeftUpLeg').degrees) expect(x).toBeLessThan(0);
    for (const [, , z] of track('LeftUpLeg').degrees) expect(z).toBeGreaterThan(0);
    for (const [, , z] of track('RightUpLeg').degrees) expect(z).toBeLessThan(0);
    for (const bone of ['LeftArm', 'RightArm']) for (const [x] of track(bone).degrees) expect(x).toBeLessThanOrEqual(-30);
    for (const bone of ['LeftForeArm', 'RightForeArm']) for (const [x] of track(bone).degrees) expect(x).toBeLessThanOrEqual(-60);
    // The body is lower than standing.
    for (const value of ROLL6_GUARD.hipsLift.values) expect(value).toBeLessThan(0);
  });

  it('is found by name beside the two states', () => {
    expect(ROLL6_CLIPS_BY_NAME.guard).toBe(ROLL6_GUARD);
    expect(ROLL6_CLIPS_BY_NAME.idle).toBe(ROLL6_CLIPS.idle);
    expect(ROLL6_CLIPS_BY_NAME.walk).toBe(ROLL6_CLIPS.walk);
  });
});
