import { describe, expect, it } from 'vitest';
import { animationSources, isMixamoSkeleton, normalizeBoneName, pickClip } from './modelAnimations';

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
  it('the orc (no clips, Mixamo skeleton) gets Roll6\'s idle and walk', () => {
    expect(animationSources([], ORC_BONES)).toEqual({ idle: 'roll6', walk: 'roll6', down: 'roll6' });
  });

  it('a file with both clips uses its own, whatever the skeleton', () => {
    expect(animationSources(['Idle', 'Walk'], ['root'])).toEqual({ idle: 'file', walk: 'file', down: 'static' });
  });

  it('a file with only the idle clip walks with Roll6\'s walk', () => {
    expect(animationSources(['Idle'], ORC_BONES)).toEqual({ idle: 'file', walk: 'roll6', down: 'roll6' });
  });

  it('no clips and another skeleton (or none): it stands still', () => {
    expect(animationSources([], ['pelvis', 'thigh_l'])).toEqual({ idle: 'static', walk: 'static', down: 'static' });
    expect(animationSources(['Idle'], [])).toEqual({ idle: 'file', walk: 'static', down: 'static' });
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
