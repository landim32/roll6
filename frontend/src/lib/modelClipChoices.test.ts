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
    expect(parseClipChoice('roll6-guard')).toEqual({ kind: 'guard' });
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
    expect(resolveAnimation(null, ['Attack'], ORC_BONES, 'walk')).toEqual({ source: 'roll6', clip: 'walk' });
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
    expect(resolveAnimation('roll6', clips, ORC_BONES, 'idle')).toEqual({ source: 'roll6', clip: 'idle' });
    expect(resolveAnimation('roll6', clips, OTHER_BONES, 'idle')).toEqual({ source: 'static' });
    expect(resolveAnimation('none', clips, ORC_BONES, 'walk')).toEqual({ source: 'static' });
  });

  it('resolvedSources gives both states', () => {
    expect(resolvedSources({ idle: 'none', walk: null, down: 'none' }, clips, ORC_BONES)).toEqual({ idle: 'static', walk: 'file', down: 'static' });
    expect(resolvedSources(AUTO_CLIPS, [], ORC_BONES)).toEqual({ idle: 'roll6', walk: 'roll6', down: 'roll6' });
  });
});

describe('clipChoiceOptions (056)', () => {
  it('lists automatic (saying what it picks), the clips of the file, Roll6 for a Mixamo skeleton and none', () => {
    const options = clipChoiceOptions(['Walk', 'Idle', 'Walk'], ORC_BONES, 'walk');
    expect(options.map((option) => option.value)).toEqual(['', 'clip:Walk', 'clip:Idle', 'roll6', 'roll6-guard', 'none']);
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
    expect(sameClipChoices({ idle: null, walk: 'none', down: null }, { idle: null, walk: 'none', down: null })).toBe(true);
    expect(sameClipChoices({ idle: null, walk: 'none', down: null }, { idle: 'none', walk: null, down: null })).toBe(false);
    expect(clipChoicesKey({ idle: null, walk: 'none', down: null })).not.toBe(clipChoicesKey({ idle: 'none', walk: null, down: null }));
    expect(clipChoicesKey(AUTO_CLIPS)).toBe(clipChoicesKey({ idle: null, walk: null, down: null }));
  });
});

describe('guard stance choice (057)', () => {
  it('"roll6-guard" plays Roll6\'s guard stance on a Mixamo skeleton, in either state', () => {
    expect(resolveAnimation('roll6-guard', [], ORC_BONES, 'idle')).toEqual({ source: 'roll6', clip: 'guard' });
    expect(resolveAnimation('roll6-guard', ['Walk'], ORC_BONES, 'walk')).toEqual({ source: 'roll6', clip: 'guard' });
  });

  it('stands still on another skeleton', () => {
    expect(resolveAnimation('roll6-guard', [], OTHER_BONES, 'idle')).toEqual({ source: 'static' });
  });

  it('is offered right after Roll6\'s own animation, only for a Mixamo skeleton', () => {
    const values = clipChoiceOptions([], ORC_BONES, 'idle').map((option) => option.value);
    expect(values.indexOf('roll6-guard')).toBe(values.indexOf('roll6') + 1);
    expect(clipChoiceOptions([], OTHER_BONES, 'idle').map((option) => option.value)).not.toContain('roll6-guard');
    expect(clipChoiceOptions([], ORC_BONES, 'idle').find((option) => option.value === 'roll6-guard')?.kind).toBe('guard');
  });
});

describe('the down state choices (058)', () => {
  it("automatic: the file's death clip, else Roll6's death on a Mixamo skeleton, else nothing", () => {
    expect(resolveAnimation(null, ['Idle', 'Death'], OTHER_BONES, 'down')).toEqual({ source: 'file', index: 1 });
    expect(resolveAnimation(null, ['Idle'], ORC_BONES, 'down')).toEqual({ source: 'roll6', clip: 'death' });
    expect(resolveAnimation(null, ['Idle'], OTHER_BONES, 'down')).toEqual({ source: 'static' });
  });

  it("'roll6' is Roll6's death; 'none' lies still; a chosen file clip plays", () => {
    expect(resolveAnimation('roll6', [], ORC_BONES, 'down')).toEqual({ source: 'roll6', clip: 'death' });
    expect(resolveAnimation('none', ['Death'], ORC_BONES, 'down')).toEqual({ source: 'static' });
    expect(resolveAnimation('clip:Fall', ['Fall', 'Death'], ORC_BONES, 'down')).toEqual({ source: 'file', index: 0 });
  });

  it('offers no guard stance for the down state', () => {
    const values = clipChoiceOptions(['Death'], ORC_BONES, 'down').map((option) => option.value);
    expect(values).toEqual(['', 'clip:Death', 'roll6', 'none']);
  });

  it('a different down choice is another key', () => {
    expect(sameClipChoices({ idle: null, walk: null, down: 'none' }, AUTO_CLIPS)).toBe(false);
    expect(clipChoicesKey({ idle: null, walk: null, down: 'none' })).not.toBe(clipChoicesKey(AUTO_CLIPS));
  });
});
