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
    expect(parseClipChoice('none')).toEqual({ kind: 'none' });
    expect(parseClipChoice('clip:Armature|Walk')).toEqual({ kind: 'file', name: 'Armature|Walk' });
    expect(fileClipChoice('Idle')).toBe('clip:Idle');
  });

  it('treats anything unknown as automatic, Roll6\'s former own animations included (061)', () => {
    expect(parseClipChoice('clip:')).toEqual({ kind: 'auto' });
    expect(parseClipChoice('Walk')).toEqual({ kind: 'auto' });
    expect(parseClipChoice('roll6')).toEqual({ kind: 'auto' });
    expect(parseClipChoice('roll6-guard')).toEqual({ kind: 'auto' });
  });
});

describe('resolveAnimation (056)', () => {
  const clips = ['Attack', 'Walk', 'Idle'];

  it('automatic follows the names of the file, then nothing — whatever the skeleton (061)', () => {
    expect(resolveAnimation(null, clips, OTHER_BONES, 'walk')).toEqual({ source: 'file', index: 1 });
    expect(resolveAnimation(null, ['Attack'], ORC_BONES, 'walk')).toEqual({ source: 'static' });
    expect(resolveAnimation(null, ['Attack'], OTHER_BONES, 'walk')).toEqual({ source: 'static' });
  });

  it('a chosen clip of the file plays whatever its name, by its exact name', () => {
    expect(resolveAnimation('clip:Attack', clips, OTHER_BONES, 'idle')).toEqual({ source: 'file', index: 0 });
    expect(resolveAnimation('clip:attack', clips, OTHER_BONES, 'idle')).toEqual({ source: 'file', index: 2 });
  });

  it('a chosen clip the file no longer has falls back to automatic', () => {
    expect(resolveAnimation('clip:Run', clips, OTHER_BONES, 'walk')).toEqual({ source: 'file', index: 1 });
  });

  it('"none" always stands still', () => {
    expect(resolveAnimation('none', clips, ORC_BONES, 'walk')).toEqual({ source: 'static' });
  });

  it('resolvedSources gives the three states', () => {
    expect(resolvedSources({ idle: 'none', walk: null, down: 'none' }, clips, ORC_BONES)).toEqual({ idle: 'static', walk: 'file', down: 'static' });
    expect(resolvedSources(AUTO_CLIPS, [], ORC_BONES)).toEqual({ idle: 'static', walk: 'static', down: 'static' });
  });
});

describe('clipChoiceOptions (056)', () => {
  it('lists automatic (saying what it picks), the clips of the file and none — nothing of Roll6 (061)', () => {
    const options = clipChoiceOptions(['Walk', 'Idle', 'Walk'], ORC_BONES, 'walk');
    expect(options.map((option) => option.value)).toEqual(['', 'clip:Walk', 'clip:Idle', 'none']);
    expect(options[0]).toMatchObject({ kind: 'auto', resolves: 'file', resolvesName: 'Walk' });
    expect(options[1]).toMatchObject({ kind: 'file', name: 'Walk' });
  });

  it('says when automatic is nothing', () => {
    const options = clipChoiceOptions(['Attack'], OTHER_BONES, 'idle');
    expect(options.map((option) => option.value)).toEqual(['', 'clip:Attack', 'none']);
    expect(options[0]).toMatchObject({ kind: 'auto', resolves: 'static' });
  });

  it('maps the select value back to the stored choice', () => {
    expect(clipChoiceFromValue('')).toBeNull();
    expect(clipChoiceFromValue('none')).toBe('none');
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

describe('the down state choices (058)', () => {
  it("automatic: the file's death clip, else nothing (the model lies on its back)", () => {
    expect(resolveAnimation(null, ['Idle', 'Death'], OTHER_BONES, 'down')).toEqual({ source: 'file', index: 1 });
    expect(resolveAnimation(null, ['Idle'], ORC_BONES, 'down')).toEqual({ source: 'static' });
  });

  it("'none' lies still; a chosen file clip plays", () => {
    expect(resolveAnimation('none', ['Death'], ORC_BONES, 'down')).toEqual({ source: 'static' });
    expect(resolveAnimation('clip:Fall', ['Fall', 'Death'], ORC_BONES, 'down')).toEqual({ source: 'file', index: 0 });
  });

  it('offers automatic, the clips of the file and none', () => {
    const values = clipChoiceOptions(['Death'], ORC_BONES, 'down').map((option) => option.value);
    expect(values).toEqual(['', 'clip:Death', 'none']);
  });

  it('a different down choice is another key', () => {
    expect(sameClipChoices({ idle: null, walk: null, down: 'none' }, AUTO_CLIPS)).toBe(false);
    expect(clipChoicesKey({ idle: null, walk: null, down: 'none' })).not.toBe(clipChoicesKey(AUTO_CLIPS));
  });
});
