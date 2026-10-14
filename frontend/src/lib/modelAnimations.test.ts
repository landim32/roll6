import { describe, expect, it } from 'vitest';
import {
  animationChoice, animationSources, clipChoiceIds, isMixamoSkeleton, normalizeBoneName, parseClipChoice, pickClip, resolveAnimation,
  resolvedSources, STATE_ANIMATION_TYPE,
} from './modelAnimations';
import type { Roll6Clip } from './roll6Clips';

/** The example orc's skeleton (055), as named in the file. */
const ORC_BONES = [
  'Hips', 'LeftUpLeg', 'LeftLeg', 'LeftFoot', 'LeftToeBase', 'RightUpLeg', 'RightLeg', 'RightFoot', 'RightToeBase', 'Spine',
  'Spine1', 'Spine2', 'LeftShoulder', 'LeftArm', 'LeftForeArm', 'LeftHand', 'Neck', 'Head', 'RightShoulder', 'RightArm',
  'RightForeArm', 'RightHand',
].map((name) => `mixamorig:${name}`);

describe('normalizeBoneName', () => {
  it('drops the Mixamo prefix in every spelling', () => {
    expect(normalizeBoneName('mixamorig:Hips')).toBe('Hips');
    expect(normalizeBoneName('mixamorig1:Hips')).toBe('Hips');
    expect(normalizeBoneName('mixamorig_Hips')).toBe('Hips');
    expect(normalizeBoneName('mixamorigHips')).toBe('Hips');
    expect(normalizeBoneName('Hips')).toBe('Hips');
  });
});

describe('isMixamoSkeleton', () => {
  it('recognizes the orc, with or without the prefix', () => {
    expect(isMixamoSkeleton(ORC_BONES)).toBe(true);
    expect(isMixamoSkeleton(ORC_BONES.map((name) => name.replace(':', '')))).toBe(true);
    expect(isMixamoSkeleton(ORC_BONES.map(normalizeBoneName))).toBe(true);
  });

  it('needs every required bone', () => {
    expect(isMixamoSkeleton(ORC_BONES.filter((name) => !name.endsWith('LeftUpLeg')))).toBe(false);
    expect(isMixamoSkeleton(['pelvis', 'spine_01', 'head', 'thigh_l', 'thigh_r'])).toBe(false);
    expect(isMixamoSkeleton([])).toBe(false);
  });
});

describe('pickClip', () => {
  it('finds the clip of each state by name, ignoring case and the armature prefix', () => {
    expect(pickClip(['Walking', 'Idle'], 'idle')).toBe(1);
    expect(pickClip(['Walking', 'Idle'], 'walk')).toBe(0);
    expect(pickClip(['Armature|idle_breathing'], 'idle')).toBe(0);
    expect(pickClip(['Parado', 'Caminhar'], 'idle')).toBe(0);
    expect(pickClip(['Parado', 'Caminhar'], 'walk')).toBe(1);
  });

  it('is null when no clip matches', () => {
    expect(pickClip([], 'idle')).toBeNull();
    expect(pickClip(['Attack', 'Jump'], 'walk')).toBeNull();
  });
});

describe('animationSources', () => {
  it('a file with clips named for the states uses them', () => {
    expect(animationSources(['Idle', 'Walk'])).toEqual({ idle: 'file', walk: 'file', down: 'static' });
  });

  it('Roll6 has no animation of its own (061): no clip for a state means none, even on a Mixamo skeleton', () => {
    expect(animationSources([])).toEqual({ idle: 'static', walk: 'static', down: 'static' });
    expect(animationSources(['Idle'])).toEqual({ idle: 'file', walk: 'static', down: 'static' });
    expect(resolveAnimation(null, [], ORC_BONES, 'idle')).toEqual({ source: 'static' });
  });

  it('reads the "roll6"/"roll6-guard" of the former own animations as automatic (061)', () => {
    expect(parseClipChoice('roll6')).toEqual({ kind: 'auto' });
    expect(parseClipChoice('roll6-guard')).toEqual({ kind: 'auto' });
    expect(resolveAnimation('roll6', ['Walk'], ORC_BONES, 'walk')).toEqual({ source: 'file', index: 0 });
  });
});

describe('the down state (058)', () => {
  it('finds a death clip by name, ignoring case and the armature prefix', () => {
    expect(pickClip(['Idle', 'Death'], 'down')).toBe(1);
    expect(pickClip(['Armature|Dying'], 'down')).toBe(0);
    expect(pickClip(['die'], 'down')).toBe(0);
    expect(pickClip(['Morte'], 'down')).toBe(0);
    expect(pickClip(['Dead_Pose'], 'down')).toBe(0);
  });

  it('does not take other clips for a death', () => {
    expect(pickClip(['Soldier_Idle', 'Walk', 'Diet'], 'down')).toBeNull();
  });
});

describe('library animations (059)', () => {
  const clip = { name: 'animation:7' } as Roll6Clip;

  it('reads "animation:{id}" choices with a positive id only', () => {
    expect(parseClipChoice('animation:7')).toEqual({ kind: 'animation', id: 7 });
    expect(parseClipChoice(animationChoice(12))).toEqual({ kind: 'animation', id: 12 });
    expect(parseClipChoice('animation:0')).toEqual({ kind: 'auto' });
    expect(parseClipChoice('animation:x')).toEqual({ kind: 'auto' });
  });

  it('plays a loaded animation on a Mixamo skeleton', () => {
    expect(resolveAnimation('animation:7', [], ORC_BONES, 'idle', new Map([[7, clip]]))).toEqual({ source: 'library', id: 7 });
  });

  it('falls back to automatic while loading or when the file failed', () => {
    expect(resolveAnimation('animation:7', ['Idle'], ORC_BONES, 'idle')).toEqual({ source: 'file', index: 0 });
    expect(resolveAnimation('animation:7', [], ORC_BONES, 'down', new Map([[7, null]]))).toEqual({ source: 'static' });
  });

  it('is nothing on a skeleton that is not Mixamo', () => {
    expect(resolveAnimation('animation:7', ['Idle'], ['pelvis'], 'idle', new Map([[7, clip]]))).toEqual({ source: 'static' });
  });

  it('tells the sources and the ids to load', () => {
    const choices = { idle: 'animation:7', walk: 'animation:7', down: 'animation:9' };
    expect(resolvedSources(choices, [], ORC_BONES, new Map([[7, clip]]))).toEqual({ idle: 'library', walk: 'library', down: 'static' });
    expect(clipChoiceIds(choices)).toEqual([7, 9]);
    expect(clipChoiceIds({ idle: 'none', walk: null, down: 'clip:Death' })).toEqual([]);
  });

  it('takes one library type per state (Q2)', () => {
    expect(STATE_ANIMATION_TYPE).toEqual({ idle: 1, walk: 2, down: 5 });
  });
});
