import { describe, expect, it, vi } from 'vitest';
import { AnimationClip, BoxGeometry, Mesh, MeshStandardMaterial, Scene, VectorKeyframeTrack } from 'three';
import type { Material } from 'three';

const { material, idle } = vi.hoisted(() => ({
  material: { current: null as MeshStandardMaterial | null },
  idle: { current: null as AnimationClip | null },
}));

vi.mock('./loadModel', async () => {
  const three = await import('three');
  const makeScene = () => {
    const root = new three.Group();
    const body = new three.Mesh(new three.BoxGeometry(1, 1, 1), material.current!);
    body.name = 'body';
    root.add(body);
    return root;
  };
  return {
    loadModel: () => Promise.resolve({
      scene: makeScene(),
      bounds: { min: [-0.5, 0, -0.5], max: [0.5, 2, 0.5] },
      clipNames: [],
      boneNames: [],
      clips: () => ({ idle: idle.current, walk: null, down: null }),
    }),
    instantiate: () => makeScene(),
  };
});
vi.mock('./socketAnchors', () => ({ forgetSockets: () => undefined, measureSockets: () => undefined }));
vi.mock('./weaponSockets', () => ({
  createWeaponSockets: () => ({ sync: () => undefined, refresh: () => undefined, reset: () => undefined }),
  sameSocketWeapons: () => true,
}));
vi.mock('../../lib/animationCache', () => ({ loadAnimations: () => Promise.resolve(new Map()) }));

import { createModelSet } from './modelSet';
import type { ModelSpec } from './modelSet';

const spec: ModelSpec = {
  id: 1, url: 'a.glb', width: 69, center: { x: 0, y: 0 }, yaw: 0, ground: 0,
  clips: { idle: null, walk: null, down: null }, lying: false,
};
const flush = () => new Promise((resolve) => { setTimeout(resolve, 0); });
const bodyOf = (scene: Scene) => scene.getObjectByName('body') as Mesh<BoxGeometry, Material>;

const prepare = () => {
  material.current = new MeshStandardMaterial();
  // The idle walks the body 10 units along x in one second.
  idle.current = new AnimationClip('idle', 1, [new VectorKeyframeTrack('body.position', [0, 1], [0, 0, 0, 10, 0, 0])]);
};

describe('modelSet options (103)', () => {
  it('without options the idle plays', async () => {
    prepare();
    const scene = new Scene();
    const set = createModelSet(scene, { onReady: () => undefined, onFailed: () => undefined, onChange: () => undefined });
    set.setModels([spec]);
    await flush();

    expect(set.update(0.5)).toBe(true);
    expect(bodyOf(scene).position.x).toBeGreaterThan(1);
    set.dispose();
  });

  it('still holds the first frame of the idle and never advances', async () => {
    prepare();
    const scene = new Scene();
    const set = createModelSet(scene, { onReady: () => undefined, onFailed: () => undefined, onChange: () => undefined },
      { still: true });
    set.setModels([spec]);
    await flush();

    expect(set.update(0.5)).toBe(false);
    set.setWalking(1, true);
    expect(set.update(0.5)).toBe(false);
    expect(bodyOf(scene).position.x).toBe(0);
    set.dispose();
  });

  it('patches copies of the materials and leaves the loaded ones alone', async () => {
    prepare();
    const scene = new Scene();
    const patched: Material[] = [];
    const set = createModelSet(scene, { onReady: () => undefined, onFailed: () => undefined, onChange: () => undefined },
      { still: true, patchMaterial: (m) => { patched.push(m); } });
    set.setModels([spec]);
    await flush();

    const body = bodyOf(scene);
    expect(patched).toHaveLength(1);
    expect(body.material).toBe(patched[0]);
    expect(body.material).not.toBe(material.current);
    set.dispose();
  });
});
