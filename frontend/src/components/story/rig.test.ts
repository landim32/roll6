import { describe, expect, it } from 'vitest';
import {
  Bone, BufferGeometry, Float32BufferAttribute, Group, MeshBasicMaterial, Object3D, Skeleton, SkinnedMesh, Uint16BufferAttribute,
  Vector3,
} from 'three';
import { alignSkeletonToMesh, restoreBindPose } from './loadModel';
import { fitToRig } from './threeClips';
import { ROLL6_CLIPS } from '../../lib/roll6Clips';

/**
 * A tiny skinned "character" (055): a vertical body bound to the hips and a left arm along +X — spine part, upper arm
 * and forearm — bound to their bones, like the example orc. Options reproduce what broke the orc: the skeleton laid
 * rotated 90° about the vertical against the mesh, the joint nodes left at the origin with the rest pose only in the
 * inverse bind matrices (with a plain node between two joints), and half of the forearm and hand bound to the hips —
 * every other column, the way an automatic rig scatters the hips' weight through a limb.
 */
const character = ({ rotated = false, collapsed = false, handOnHips = false } = {}) => {
  const root = new Group();
  const turn = (x: number, y: number, z: number): [number, number, number] => (rotated ? [z, y, -x] : [x, y, z]);
  const bone = (name: string, parent: Object3D, world: [number, number, number]): Bone => {
    const node = new Bone();
    node.name = `mixamorig${name}`;
    parent.add(node);
    parent.updateMatrixWorld(true);
    node.position.copy(parent.worldToLocal(new Vector3(...world)));
    node.updateMatrixWorld(true);
    return node;
  };
  const hips = bone('Hips', root, turn(0, 0, 0));
  const spine = bone('Spine', hips, turn(0, 1, 0));
  const arm = bone('LeftArm', spine, turn(0.1, 1, 0));
  // A plain node between the upper arm and the forearm (not a joint of the skin), like the orc's finger nodes.
  const between = new Object3D();
  between.name = 'mixamorigLeftArmTwist';
  arm.add(between);
  const foreArm = bone('LeftForeArm', between, turn(0.5, 1, 0));
  const hand = bone('LeftHand', foreArm, turn(0.9, 1, 0));
  const bones = [hips, spine, arm, foreArm, hand];

  const positions: number[] = [];
  const indexes: number[] = [];
  const weights: number[] = [];
  const triangles: number[] = [];
  const strip = (points: [number, number, number][][], jointOf: (point: [number, number, number]) => number) => {
    const start = positions.length / 3;
    points.forEach((row) => row.forEach((point) => {
      positions.push(...point);
      indexes.push(jointOf(point), 0, 0, 0);
      weights.push(1, 0, 0, 0);
    }));
    const columns = points[0].length;
    for (let c = 0; c < columns - 1; c++) {
      const a = start + c;
      const b = start + columns + c;
      triangles.push(a, b, a + 1, a + 1, b, b + 1);
    }
  };
  // Body: x ±0.02 from y 0 to 0.95, on the hips.
  strip([0, 1].map((side) => Array.from({ length: 20 }, (_, i) => [side ? 0.02 : -0.02, i * 0.05, 0] as [number, number, number])), () => 0);
  // Arm: y 1 ± 0.02 from x 0 to 1; spine part, upper arm, forearm and hand.
  strip([0.98, 1.02].map((y) => Array.from({ length: 41 }, (_, i) => [i * 0.025, y, 0] as [number, number, number])), ([x]) => {
    if (x < 0.1) return 1;
    if (x < 0.5) return 2;
    if (handOnHips && Math.round(x / 0.025) % 2 === 1) return 0;
    return x < 0.9 ? 3 : 4;
  });
  const geometry = new BufferGeometry();
  geometry.setAttribute('position', new Float32BufferAttribute(positions, 3));
  geometry.setAttribute('skinIndex', new Uint16BufferAttribute(indexes, 4));
  geometry.setAttribute('skinWeight', new Float32BufferAttribute(weights, 4));
  geometry.setIndex(triangles);
  const mesh = new SkinnedMesh(geometry, new MeshBasicMaterial());
  root.add(mesh);
  root.updateMatrixWorld(true);
  mesh.bind(new Skeleton(bones));
  if (collapsed) {
    // Every node at the origin: the rest pose survives only in the inverse bind matrices.
    for (const node of [...bones, between]) node.position.set(0, 0, 0);
    root.updateMatrixWorld(true);
  }
  return { root, bones: { hips, arm, foreArm, hand } };
};

const worldOf = (node: Object3D) => new Vector3().setFromMatrixPosition(node.matrixWorld);

describe('restoreBindPose (055)', () => {
  it('rebuilds every joint from its inverse bind matrix, also under a node that is not a joint', () => {
    const { root, bones } = character({ collapsed: true });
    expect(restoreBindPose(root)).toBe(true);
    expect(worldOf(bones.arm).distanceTo(new Vector3(0.1, 1, 0))).toBeLessThan(1e-5);
    expect(worldOf(bones.foreArm).distanceTo(new Vector3(0.5, 1, 0))).toBeLessThan(1e-5);
    expect(worldOf(bones.hand).distanceTo(new Vector3(0.9, 1, 0))).toBeLessThan(1e-5);
  });

  it('leaves a skeleton already in its bind pose alone', () => {
    expect(restoreBindPose(character().root)).toBe(false);
  });
});

describe('alignSkeletonToMesh (055)', () => {
  it('turns a skeleton laid 90° off its mesh back onto it, keeping the rest pose exact', () => {
    const { root, bones } = character({ rotated: true });
    expect(worldOf(bones.arm).z).toBeCloseTo(-0.1, 5);
    expect(alignSkeletonToMesh(root)).not.toBe(0);
    expect(worldOf(bones.arm).distanceTo(new Vector3(0.1, 1, 0))).toBeLessThan(1e-5);
    // Bound again: at rest every vertex is where the mesh has it.
    let mesh: SkinnedMesh | undefined;
    root.traverse((node) => { if ((node as SkinnedMesh).isSkinnedMesh) mesh = node as SkinnedMesh; });
    mesh!.skeleton.update();
    const position = mesh!.geometry.getAttribute('position');
    const skinned = new Vector3();
    for (let i = 0; i < position.count; i++) {
      mesh!.getVertexPosition(i, skinned);
      expect(skinned.distanceTo(new Vector3().fromBufferAttribute(position, i))).toBeLessThan(1e-5);
    }
  });

  it('leaves an aligned skeleton alone', () => {
    expect(alignSkeletonToMesh(character().root)).toBe(0);
  });
});

describe('fitToRig (055)', () => {
  it('keeps the whole motion of a sound rig', () => {
    const { root } = character();
    const limits = fitToRig(ROLL6_CLIPS.walk, root, 1);
    expect(limits.LeftArm).toBe(1);
    expect(limits.LeftForeArm).toBe(1);
  });

  it('holds the arm still when much of the limb is bound to the hips, so the mesh never tears', () => {
    const { root } = character({ handOnHips: true });
    const limits = fitToRig(ROLL6_CLIPS.idle, root, 1);
    expect(limits.LeftArm).toBeLessThan(1);
  });

  it('puts the bones back at rest after trying the motions', () => {
    const { root, bones } = character({ handOnHips: true });
    const before = worldOf(bones.hand);
    fitToRig(ROLL6_CLIPS.walk, root, 1);
    expect(worldOf(bones.hand).distanceTo(before)).toBeLessThan(1e-9);
  });
});
