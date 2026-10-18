import { describe, expect, it } from 'vitest';
import { FIGURE_HEIGHT, REST_POSE, STANDARD_SKELETON, figureSegments, jointPositions, projectPoint, samplePose } from './skeletonFigure';
import type { Roll6Clip } from './roll6Clips';

const clip = (tracks: Roll6Clip['tracks'], hipsLift: Roll6Clip['hipsLift'] = { times: [], values: [] }) => ({ tracks, hipsLift });

describe('standard skeleton figure (090)', () => {
  it('lists parents before their children', () => {
    const seen = new Set<string>();
    for (const bone of STANDARD_SKELETON) {
      if (bone.parent) expect(seen.has(bone.parent)).toBe(true);
      seen.add(bone.name);
    }
  });

  it('stands at rest with the feet on the floor, the head on top and the arms relaxed below the shoulders', () => {
    const joints = jointPositions(REST_POSE);
    expect(joints.get('HeadTop_End')![1]).toBeCloseTo(FIGURE_HEIGHT, 5);
    expect(joints.get('LeftFoot')![1]).toBeGreaterThan(0);
    expect(joints.get('LeftToe_End')![1]).toBeCloseTo(0, 5);
    expect(joints.get('LeftHand')![1]).toBeLessThan(joints.get('LeftArm')![1]);
    expect(joints.get('RightHand')![1]).toBeLessThan(joints.get('RightArm')![1]);
    // The left side is +X, a little out from the body.
    expect(joints.get('LeftHand')![0]).toBeGreaterThan(joints.get('LeftArm')![0]);
    expect(joints.get('RightHand')![0]).toBeLessThan(joints.get('RightArm')![0]);
  });

  it('lifts the left arm with a turn about +Z and swings it back with a turn about +X', () => {
    const rest = jointPositions(REST_POSE).get('LeftHand')!;
    const raised = jointPositions(samplePose(clip([{ bone: 'LeftArm', times: [0], degrees: [[0, 0, 90]] }]), 0)).get('LeftHand')!;
    expect(raised[1]).toBeGreaterThan(rest[1]);
    const back = jointPositions(samplePose(clip([{ bone: 'LeftArm', times: [0], degrees: [[60, 0, 0]] }]), 0)).get('LeftHand')!;
    expect(back[2]).toBeLessThan(rest[2]);
  });

  it('carries a parent turn to its children', () => {
    const bent = jointPositions(samplePose(clip([{ bone: 'Spine', times: [0], degrees: [[45, 0, 0]] }]), 0));
    const rest = jointPositions(REST_POSE);
    expect(bent.get('Head')![2]).not.toBeCloseTo(rest.get('Head')![2], 3);
    expect(bent.get('LeftFoot')).toEqual(rest.get('LeftFoot'));
  });

  it('interpolates between keys and moves the whole figure with the hips lift', () => {
    const swing = clip([{ bone: 'LeftUpLeg', times: [0, 1], degrees: [[0, 0, 0], [-40, 0, 0]] }]);
    expect(samplePose(swing, 0.5).turns.LeftUpLeg).toEqual([-20, 0, 0]);
    expect(samplePose(swing, 5).turns.LeftUpLeg).toEqual([-40, 0, 0]);
    const lowered = jointPositions(samplePose(clip([], { times: [0], values: [-0.5], of: 'hips' }), 0));
    expect(lowered.get('Hips')![1]).toBeCloseTo(0.53 * 0.5, 5);
    expect(lowered.get('HeadTop_End')![1]).toBeCloseTo(FIGURE_HEIGHT - 0.53 * 0.5, 5);
  });

  it('draws one segment per bone with a parent', () => {
    expect(figureSegments(REST_POSE)).toHaveLength(STANDARD_SKELETON.length - 1);
  });

  it('projects the character left to the viewer right when it faces the camera', () => {
    expect(projectPoint([1, 0, 0], 0, 0)[0]).toBeLessThan(0);
    expect(projectPoint([0, 1, 0], 0, 0)[1]).toBeCloseTo(1, 6);
  });
});
