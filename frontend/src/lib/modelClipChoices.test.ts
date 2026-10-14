import { describe, expect, it } from 'vitest';
import {
  AUTO_CLIPS, clipChoiceFromValue, clipChoiceOptions, clipChoicesKey, fileClipChoice, parseClipChoice, resolveAnimation,
  resolvedSources, sameClipChoices,
} from './modelAnimations';

/** The example orc's skeleton (055), as named in the file. */
const ORC_BONES = [
  'Hips', 'LeftUpLeg', 'LeftLeg', 'LeftFoot', 'LeftToeBase', 'RightUpLeg', 'RightLeg', 'RightFoot', 'RightToeBase', 'Spine',
  'Spine1', 'Spine2', 'LeftShoulder', 'LeftArm', 'LeftForeArm', 'LeftHand', 'Neck', 'Head', 'RightShoulder', 'RightArm',
  'RightForeArm', 'RightHand',
].map((name) => `mixamorig:${name}`);
const OTHER_BONES = ['pelvis', 'thigh_l'];

describe('parseClipChoice (056)', () => {
  it('reads the stored values the server accepts', () => {
    expect(parseClipChoice(null)).toEqual({ kind: 'auto' });
    expect(parseClipChoice('')).toEqual({ kind: 'auto' });
    expect(parseClipChoice('roll6')).toEqual({ kind: 'roll6' });
    expect(parseClipChoice('none')).toEqual({ kind: 'none' });
    expect(parseClipChoice('clip:Armature|Walk')).toEqual({ kind: 'file', name: 'Armature|Walk' });
    expect(fileClipChoice('Idle')).toBe('clip:Idle');
  });

  it('treats anything unknown as automatic', () => {
    expect(parseClipChoice('clip:')).toEqual({ kind: 'auto' });
    expect(parseClipChoice('Walk')).toEqual({ kind: 'auto' });
  });
});

describe('resolveAnimation (056)', () => {
  const clips = ['Attack', 'Walk', 'Idle'];

  it('automatic follows the names of the file, then Roll6, then nothing', () => {
    expect(resolveAnimation(null, clips, OTHER_BONES, 'walk')).toEqual({ source: 'file', index: 1 });
    expect(resolveAnimation(null, ['Attack'], ORC_BONES, 'walk')).toEqual({ source: 'roll6' });
    expect(resolveAnimation(null, ['Attack'], OTHER_BONES, 'walk')).toEqual({ source: 'static' });
  });

  it('a chosen clip of the file plays whatever its name, by its exact name', () => {
    expect(resolveAnimation('clip:Attack', clips, OTHER_BONES, 'idle')).toEqual({ source: 'file', index: 0 });
    expect(resolveAnimation('clip:attack', clips, OTHER_BONES, 'idle')).toEqual({ source: 'file', index: 2 });
  });

  it('a chosen clip the file no longer has falls back to automatic', () => {
    expect(resolveAnimation('clip:Run', clips, OTHER_BONES, 'walk')).toEqual({ source: 'file', index: 1 });
  });

  it('"roll6" needs the Mixamo skeleton and "none" always stands still', () => {
    expect(resolveAnimation('roll6', clips, ORC_BONES, 'idle')).toEqual({ source: 'roll6' });
    expect(resolveAnimation('roll6', clips, OTHER_BONES, 'idle')).toEqual({ source: 'static' });
    expect(resolveAnimation('none', clips, ORC_BONES, 'walk')).toEqual({ source: 'static' });
  });

  it('resolvedSources gives both states', () => {
    expect(resolvedSources({ idle: 'none', walk: null }, clips, ORC_BONES)).toEqual({ idle: 'static', walk: 'file' });
    expect(resolvedSources(AUTO_CLIPS, [], ORC_BONES)).toEqual({ idle: 'roll6', walk: 'roll6' });
  });
});

describe('clipChoiceOptions (056)', () => {
  it('lists automatic (saying what it picks), the clips of the file, Roll6 for a Mixamo skeleton and none', () => {
    const options = clipChoiceOptions(['Walk', 'Idle', 'Walk'], ORC_BONES, 'walk');
    expect(options.map((option) => option.value)).toEqual(['', 'clip:Walk', 'clip:Idle', 'roll6', 'none']);
    expect(options[0]).toMatchObject({ kind: 'auto', resolves: 'file', resolvesName: 'Walk' });
    expect(options[1]).toMatchObject({ kind: 'file', name: 'Walk' });
  });

  it('leaves Roll6 out for another skeleton and says when automatic is nothing', () => {
    const options = clipChoiceOptions(['Attack'], OTHER_BONES, 'idle');
    expect(options.map((option) => option.value)).toEqual(['', 'clip:Attack', 'none']);
    expect(options[0]).toMatchObject({ kind: 'auto', resolves: 'static' });
  });

  it('maps the select value back to the stored choice', () => {
    expect(clipChoiceFromValue('')).toBeNull();
    expect(clipChoiceFromValue('roll6')).toBe('roll6');
  });
});

describe('clip choice keys', () => {
  it('compares and keys pairs of choices', () => {
    expect(sameClipChoices({ idle: null, walk: 'none' }, { idle: null, walk: 'none' })).toBe(true);
    expect(sameClipChoices({ idle: null, walk: 'none' }, { idle: 'none', walk: null })).toBe(false);
    expect(clipChoicesKey({ idle: null, walk: 'none' })).not.toBe(clipChoicesKey({ idle: 'none', walk: null }));
    expect(clipChoicesKey(AUTO_CLIPS)).toBe(clipChoicesKey({ idle: null, walk: null }));
  });
});
