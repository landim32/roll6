import {
  BufferAttribute, BufferGeometry, Color, Group, LineBasicMaterial, LineSegments, Mesh, Points, PointsMaterial, Vector3,
} from 'three';
import type { Bone, Camera, Material, Object3D, Scene } from 'three';
import { HOLDER } from '../../story/attachWeapons';
import { MODEL_OPACITY, boneSegments, nearestBone, segmentColor } from './skeleton';
import type { BoneSegment, PickTarget, ScreenPoint } from './skeleton';

/** Size of a joint on screen, in pixels. */
const JOINT_SIZE = 6;
/** Drawn after the model, without depth, so no bone hides inside the mesh. */
const ON_TOP = 999;

export interface SkeletonView {
  /** The model has bones to show. */
  readonly hasBones: boolean;
  readonly enabled: boolean;
  setEnabled: (on: boolean) => void;
  /** The bones the open animation moves (amber). */
  setMoved: (names: ReadonlySet<string>) => void;
  /** The bone under the pointer (white), or none. */
  setHovered: (index: number | null) => void;
  /** The bone nearest to a point of the canvas (CSS pixels), with its name. */
  pick: (x: number, y: number, camera: Camera, width: number, height: number) => { index: number; name: string } | null;
  /** Follows the pose: call once per frame, after the animation moved the bones. */
  update: () => void;
  /** The bone of a picked index (066: the one the pose editor holds). */
  boneAt: (index: number) => Bone;
  /** Puts the model's materials back and frees the lines. */
  dispose: () => void;
}

interface SavedMaterial {
  transparent: boolean;
  opacity: number;
  depthWrite: boolean;
}

/**
 * The "Esqueleto" of the open model (065, research R2/R3): a line from each bone to its parent bone and a dot on each
 * joint, in world space, refreshed every frame from the pose, drawn on top of everything; while it shows, the model's
 * materials are made see-through and put back exactly as they were when it hides.
 */
export const createSkeletonView = (scene: Scene, model: Object3D): SkeletonView => {
  const bones: Bone[] = [];
  model.traverse((node) => {
    if ((node as Bone).isBone) bones.push(node as Bone);
  });
  const parents = bones.map((bone) => bones.indexOf(bone.parent as Bone));
  const segments: BoneSegment[] = boneSegments(bones.map((bone) => bone.name), parents);
  const linked = segments.filter((segment) => segment.parent !== null);

  const linePositions = new Float32Array(linked.length * 6);
  const lineColors = new Float32Array(linked.length * 6);
  const lineGeometry = new BufferGeometry();
  lineGeometry.setAttribute('position', new BufferAttribute(linePositions, 3));
  lineGeometry.setAttribute('color', new BufferAttribute(lineColors, 3));
  const lineMaterial = new LineBasicMaterial({ vertexColors: true, depthTest: false, depthWrite: false, transparent: true });
  const lines = new LineSegments(lineGeometry, lineMaterial);

  const jointPositions = new Float32Array(bones.length * 3);
  const jointColors = new Float32Array(bones.length * 3);
  const jointGeometry = new BufferGeometry();
  jointGeometry.setAttribute('position', new BufferAttribute(jointPositions, 3));
  jointGeometry.setAttribute('color', new BufferAttribute(jointColors, 3));
  const jointMaterial = new PointsMaterial({
    vertexColors: true, size: JOINT_SIZE, sizeAttenuation: false, depthTest: false, depthWrite: false, transparent: true,
  });
  const joints = new Points(jointGeometry, jointMaterial);

  for (const object of [lines, joints]) {
    object.renderOrder = ON_TOP;
    object.frustumCulled = false;
  }
  const group = new Group();
  group.add(lines, joints);
  group.visible = false;
  scene.add(group);

  const saved = new Map<Material, SavedMaterial>();
  let enabled = false;
  let moved: ReadonlySet<string> = new Set();
  let hovered: number | null = null;
  const world = bones.map(() => new Vector3());
  const color = new Color();

  const paint = () => {
    segments.forEach((segment, index) => {
      color.setHex(segmentColor(segment.name, moved, hovered === index));
      jointColors.set([color.r, color.g, color.b], index * 3);
    });
    // A line is the body of its parent bone (the arm runs from the LeftArm joint to the LeftForeArm one).
    linked.forEach((segment, at) => {
      const owner = segments[segment.parent!];
      color.setHex(segmentColor(owner.name, moved, hovered === owner.index));
      lineColors.set([color.r, color.g, color.b, color.r, color.g, color.b], at * 6);
    });
    lineGeometry.attributes.color.needsUpdate = true;
    jointGeometry.attributes.color.needsUpdate = true;
  };

  const seeThrough = (on: boolean) => {
    // The carried weapons (092) stay opaque: they share their materials with every copy of the weapon.
    const meshes: Mesh[] = [];
    const collect = (node: Object3D) => {
      if (node.name.startsWith(HOLDER)) return;
      if ((node as Mesh).isMesh) meshes.push(node as Mesh);
      node.children.forEach(collect);
    };
    collect(model);
    meshes.forEach((mesh) => {
      const materials = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
      for (const material of materials) {
        if (on && !saved.has(material)) {
          saved.set(material, { transparent: material.transparent, opacity: material.opacity, depthWrite: material.depthWrite });
          material.transparent = true;
          material.opacity = MODEL_OPACITY;
          material.depthWrite = false;
          material.needsUpdate = true;
        }
      }
    });
    if (!on) {
      for (const [material, values] of saved) {
        material.transparent = values.transparent;
        material.opacity = values.opacity;
        material.depthWrite = values.depthWrite;
        material.needsUpdate = true;
      }
      saved.clear();
    }
  };

  const update = () => {
    if (!enabled) return;
    bones.forEach((bone, index) => {
      bone.getWorldPosition(world[index]);
      jointPositions.set([world[index].x, world[index].y, world[index].z], index * 3);
    });
    linked.forEach((segment, at) => {
      const from = world[segment.parent!];
      const to = world[segment.index];
      linePositions.set([from.x, from.y, from.z, to.x, to.y, to.z], at * 6);
    });
    lineGeometry.attributes.position.needsUpdate = true;
    jointGeometry.attributes.position.needsUpdate = true;
  };

  paint();

  return {
    hasBones: bones.length > 0,
    get enabled() {
      return enabled;
    },
    setEnabled: (on) => {
      const show = on && bones.length > 0;
      if (show === enabled) return;
      enabled = show;
      group.visible = show;
      seeThrough(show);
      if (!show) hovered = null;
      paint();
      update();
    },
    setMoved: (names) => {
      moved = names;
      paint();
    },
    setHovered: (index) => {
      if (index === hovered) return;
      hovered = index;
      paint();
    },
    pick: (x, y, camera, width, height) => {
      if (!enabled) return null;
      const screen = world.map((position) => {
        const v = position.clone().project(camera);
        return { point: { x: ((v.x + 1) / 2) * width, y: ((1 - v.y) / 2) * height } as ScreenPoint, visible: Math.abs(v.z) <= 1 };
      });
      const lines: PickTarget[] = linked.map((segment) => ({
        owner: segment.parent!,
        a: screen[segment.parent!].point,
        b: screen[segment.index].point,
        visible: screen[segment.parent!].visible && screen[segment.index].visible,
      }));
      const joints: PickTarget[] = segments.map((segment) => ({
        owner: segment.index, a: screen[segment.index].point, b: screen[segment.index].point, visible: screen[segment.index].visible,
      }));
      const index = nearestBone({ x, y }, lines, joints);
      return index === null ? null : { index, name: segments[index].name };
    },
    update,
    boneAt: (index) => bones[index],
    dispose: () => {
      seeThrough(false);
      scene.remove(group);
      lineGeometry.dispose();
      jointGeometry.dispose();
      lineMaterial.dispose();
      jointMaterial.dispose();
    },
  };
};
