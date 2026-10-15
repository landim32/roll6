import { Quaternion } from 'three';
import type { Bone, Camera, Scene } from 'three';
import { TransformControls } from 'three/examples/jsm/controls/TransformControls.js';
import type { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';

export interface BoneGizmo {
  readonly bone: Bone | null;
  /** True while a ring is being dragged. */
  readonly dragging: boolean;
  /** True when the pointer is over a ring (a click there is not a click on the skeleton). */
  readonly hovering: boolean;
  enabled: boolean;
  attach: (bone: Bone) => void;
  detach: () => void;
  dispose: () => void;
}

export interface BoneGizmoEvents {
  /** The drag goes on: how far the bone has turned since it started, in degrees. */
  onChange: (bone: Bone, degrees: number) => void;
  /** The ring was released: the bone and its local rotation before the drag. */
  onEnd: (bone: Bone, start: Quaternion) => void;
}

/** The angle between two rotations, in degrees. */
export const angleBetween = (a: Quaternion, b: Quaternion): number => {
  const dot = Math.min(1, Math.abs(a.dot(b)));
  return (2 * Math.acos(dot) * 180) / Math.PI;
};

/**
 * The rotation rings of the pose editor (066, research R2): three.js's `TransformControls` in rotate mode, in world axes
 * (the character's frame for a model facing front — the rings never turn with the bone), held on one bone; the camera's
 * orbit is off while a ring is dragged.
 */
export const createBoneGizmo = (scene: Scene, camera: Camera, canvas: HTMLCanvasElement, orbit: OrbitControls, events: BoneGizmoEvents): BoneGizmo => {
  const controls = new TransformControls(camera, canvas);
  controls.setMode('rotate');
  controls.setSpace('world');
  controls.setSize(0.7);
  const helper = controls.getHelper();
  scene.add(helper);

  let start = new Quaternion();
  let dragging = false;

  controls.addEventListener('dragging-changed', (event) => {
    dragging = Boolean(event.value);
    orbit.enabled = !dragging;
    const bone = controls.object as Bone | undefined;
    if (!bone) return;
    if (dragging) start = bone.quaternion.clone();
    else events.onEnd(bone, start.clone());
  });
  controls.addEventListener('objectChange', () => {
    const bone = controls.object as Bone | undefined;
    if (bone && dragging) events.onChange(bone, angleBetween(start, bone.quaternion));
  });

  return {
    get bone() {
      return (controls.object as Bone | undefined) ?? null;
    },
    get dragging() {
      return dragging;
    },
    get hovering() {
      return controls.axis !== null;
    },
    get enabled() {
      return controls.enabled;
    },
    set enabled(on: boolean) {
      controls.enabled = on;
      helper.visible = on && !!controls.object;
    },
    attach: (bone) => {
      controls.attach(bone);
      helper.visible = controls.enabled;
    },
    detach: () => {
      controls.detach();
      helper.visible = false;
    },
    dispose: () => {
      controls.detach();
      scene.remove(helper);
      controls.dispose();
    },
  };
};
