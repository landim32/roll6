import { useEffect, useRef } from 'react';
import type { PointerEvent as ReactPointerEvent } from 'react';
import {
  ArrowHelper, Box3, CircleGeometry, Clock, DirectionalLight, Group, HemisphereLight, Mesh, MeshBasicMaterial, PerspectiveCamera,
  Raycaster, Scene, SphereGeometry, Vector2, Vector3, WebGLRenderer,
} from 'three';
import type { Object3D } from 'three';
import { pinchZoom, wheelZoom } from '../../lib/previewZoom';
import { DEFAULT_GRIP_POINT, DEFAULT_POSE, gripPointLocal, gripPointOf } from '../../lib/weaponPose';
import type { GripPoint, WeaponPose } from '../../types/weapon';
import { cloneWeapon, loadWeapon } from '../story/loadWeapon';
import type { WeaponAsset } from '../story/loadWeapon';

interface WeaponPreviewProps {
  /** The weapon's file: a stored model's presigned URL, or a blob URL of a file just picked. */
  url: string;
  label: string;
  onError: () => void;
  /**
   * Edit mode (083): no auto-turn, the drag orbits the camera instead of turning the weapon (so the stage axes keep their
   * meaning), the pose is drawn applied, the axes "cima" (+Y, green), "direita" (+X, red) and "frente" (+Z, blue) and the grip marker are
   * shown, and a click on the model picks the grip point.
   */
  editable?: boolean;
  pose?: WeaponPose;
  gripPoint?: GripPoint;
  onPickGrip?: (point: GripPoint) => void;
  /** The zoom (085, `lib/previewZoom`): divides the camera's distance to the weapon. Default 1. */
  zoom?: number;
  /** The wheel or a pinch over the canvas asks for another zoom; the owner keeps it. */
  onZoom?: (zoom: number) => void;
}

const PREVIEW_SIZE = 1.6;
const TURN_SPEED = 0.6;
const DRAG_TURN = 0.01;
const ORBIT_RADIUS = 4.2;
const PITCH_LIMIT = (80 * Math.PI) / 180;
/** A press is a click, not a drag, within this movement and time. */
const CLICK_PIXELS = 4;
const CLICK_MS = 300;
const AXIS_LENGTH = 1.2;
const MARKER_RADIUS = 0.04;
const RAD = Math.PI / 180;

/**
 * Preview of a library weapon (082): the weapon alone over a disc, its longest side fitted to the stage, turning slowly
 * (a drag turns it by hand). Lazy, like the token's model preview — its own small three.js scene. In edit mode (083) it
 * is the weapon editor's stage: see `editable`.
 */
export const WeaponPreview = ({ url, label, onError, editable = false, pose = DEFAULT_POSE, gripPoint = DEFAULT_GRIP_POINT, onPickGrip, zoom = 1, onZoom }: WeaponPreviewProps) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const stage = useRef<Group | null>(null);
  /** Between the turntable and the weapon (083): the standard pose, turning the weapon about its grip point. */
  const poseRef = useRef<Group | null>(null);
  const weaponRef = useRef<Object3D | null>(null);
  const assetRef = useRef<WeaponAsset | null>(null);
  const markerRef = useRef<Mesh | null>(null);
  const cameraRef = useRef<PerspectiveCamera | null>(null);
  const drag = useRef<{ x: number; y: number; startX: number; startY: number; at: number } | null>(null);
  /** The camera's orbit in edit mode. */
  const orbit = useRef({ yaw: 0.4, pitch: 0.35 });
  const errorRef = useRef(onError);
  errorRef.current = onError;
  const pickRef = useRef(onPickGrip);
  pickRef.current = onPickGrip;
  const editableRef = useRef(editable);
  editableRef.current = editable;
  const poseProp = useRef(pose);
  poseProp.current = pose;
  const gripProp = useRef(gripPoint);
  gripProp.current = gripPoint;
  const zoomRef = useRef(zoom);
  zoomRef.current = zoom;
  const onZoomRef = useRef(onZoom);
  onZoomRef.current = onZoom;
  /** The pointers down on the canvas (085): one drags, two pinch the zoom (and never pick). */
  const pointers = useRef(new Map<number, { x: number; y: number }>());
  const pinch = useRef<{ zoom: number; distance: number } | null>(null);

  /** Where the weapon turns about: in edit mode its grip point sits on the pose group's origin; otherwise it rests on the disc. */
  const placeWeapon = () => {
    const weapon = weaponRef.current;
    const asset = assetRef.current;
    const group = poseRef.current;
    if (!weapon || !asset || !group) return;
    const longest = Math.max(asset.size.x, asset.size.y, asset.size.z, 1e-6);
    const scale = PREVIEW_SIZE / longest;
    weapon.scale.setScalar(scale);
    if (editableRef.current) {
      const [x, y, z] = gripPointLocal(gripProp.current, { min: asset.min, size: [asset.size.x, asset.size.y, asset.size.z] });
      weapon.position.set(-x * scale, -y * scale, -z * scale);
      group.rotation.set(poseProp.current.rx * RAD, poseProp.current.ry * RAD, poseProp.current.rz * RAD, 'XYZ');
      group.position.set(0, PREVIEW_SIZE * 0.55, 0);
    } else {
      weapon.updateMatrixWorld(true);
      const box = new Box3().setFromObject(weapon, true);
      const center = box.getCenter(new Vector3());
      weapon.position.set(-center.x, -box.min.y, -center.z);
      group.rotation.set(0, 0, 0);
      group.position.set(0, 0, 0);
    }
    const marker = markerRef.current;
    if (marker) {
      marker.visible = editableRef.current;
      marker.position.set(0, 0, 0);
    }
  };

  const placeCamera = () => {
    const camera = cameraRef.current;
    if (!camera) return;
    const radius = ORBIT_RADIUS / zoomRef.current;
    if (editableRef.current) {
      const { yaw, pitch } = orbit.current;
      const target = new Vector3(0, PREVIEW_SIZE * 0.55, 0);
      camera.position.set(
        target.x + radius * Math.cos(pitch) * Math.sin(yaw),
        target.y + radius * Math.sin(pitch),
        target.z + radius * Math.cos(pitch) * Math.cos(yaw),
      );
      camera.lookAt(target);
    } else {
      // The view camera, brought closer to its target by the zoom.
      camera.position.set(0, 0.8 + 0.6 / zoomRef.current, 4.2 / zoomRef.current);
      camera.lookAt(0, 0.8, 0);
    }
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    let renderer: WebGLRenderer;
    try {
      renderer = new WebGLRenderer({ canvas, antialias: true, alpha: true });
    } catch {
      errorRef.current();
      return;
    }
    renderer.setPixelRatio(Math.min(2, window.devicePixelRatio || 1));
    renderer.setClearColor(0x000000, 0);
    const scene = new Scene();
    scene.add(new HemisphereLight(0xffffff, 0x3a3a3a, 1.6));
    const sun = new DirectionalLight(0xffffff, 1.6);
    sun.position.set(1.5, 3, 2.5);
    scene.add(sun);
    const ground = new Mesh(new CircleGeometry(1, 48), new MeshBasicMaterial({ color: 0x1a2333 }));
    ground.rotation.x = -Math.PI / 2;
    scene.add(ground);
    const turntable = new Group();
    scene.add(turntable);
    stage.current = turntable;
    const poseGroup = new Group();
    turntable.add(poseGroup);
    poseRef.current = poseGroup;
    // The reference of the standard pose (083): "cima" +Y in green, "direita" +X in red, "frente" +Z in blue, fixed to
    // the stage.
    const axes = new Group();
    axes.add(new ArrowHelper(new Vector3(0, 1, 0), new Vector3(0, 0, 0), AXIS_LENGTH, 0x1fd67a, 0.18, 0.1));
    axes.add(new ArrowHelper(new Vector3(1, 0, 0), new Vector3(0, 0, 0), AXIS_LENGTH, 0xff5a5a, 0.18, 0.1));
    axes.add(new ArrowHelper(new Vector3(0, 0, 1), new Vector3(0, 0, 0), AXIS_LENGTH * 0.8, 0x4ea3ff, 0.16, 0.09));
    axes.position.set(0, PREVIEW_SIZE * 0.55, 0);
    axes.visible = editableRef.current;
    turntable.add(axes);
    const marker = new Mesh(new SphereGeometry(MARKER_RADIUS, 16, 12), new MeshBasicMaterial({ color: 0xf2c14e, depthTest: false }));
    marker.renderOrder = 2;
    marker.visible = editableRef.current;
    poseGroup.add(marker);
    markerRef.current = marker;
    const camera = new PerspectiveCamera(32, 1, 0.05, 100);
    cameraRef.current = camera;
    placeCamera();

    const resize = () => {
      const width = Math.max(1, canvas.clientWidth);
      const height = Math.max(1, canvas.clientHeight);
      renderer.setSize(width, height, false);
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
    };
    const observer = new ResizeObserver(resize);
    observer.observe(canvas);
    resize();
    // The wheel zooms (085); a native listener, because React's onWheel is passive and could not stop the page scroll.
    const onWheel = (event: WheelEvent) => {
      event.preventDefault();
      onZoomRef.current?.(wheelZoom(zoomRef.current, event.deltaY));
    };
    canvas.addEventListener('wheel', onWheel, { passive: false });

    let cancelled = false;
    void loadWeapon(url).then((asset) => {
      if (cancelled) return;
      if (!asset) {
        errorRef.current();
        return;
      }
      const weapon = cloneWeapon(asset);
      weaponRef.current = weapon;
      assetRef.current = asset;
      poseGroup.add(weapon);
      placeWeapon();
    });

    const clock = new Clock();
    let frame = 0;
    const loop = () => {
      frame = requestAnimationFrame(loop);
      const delta = clock.getDelta();
      axes.visible = editableRef.current;
      if (drag.current === null && !editableRef.current) turntable.rotation.y += TURN_SPEED * delta;
      renderer.render(scene, camera);
    };
    frame = requestAnimationFrame(loop);

    return () => {
      cancelled = true;
      cancelAnimationFrame(frame);
      observer.disconnect();
      canvas.removeEventListener('wheel', onWheel);
      stage.current = null;
      poseRef.current = null;
      weaponRef.current = null;
      assetRef.current = null;
      markerRef.current = null;
      cameraRef.current = null;
      ground.geometry.dispose();
      (ground.material as MeshBasicMaterial).dispose();
      marker.geometry.dispose();
      (marker.material as MeshBasicMaterial).dispose();
      renderer.dispose();
    };
  }, [url]);

  // Another pose, grip point or mode (083): the loaded weapon is placed again at once.
  useEffect(() => {
    placeWeapon();
    if (stage.current && editable) stage.current.rotation.y = 0;
    placeCamera();
  }, [editable, pose, gripPoint]);

  // Another zoom (085): the camera moves at once.
  useEffect(() => {
    placeCamera();
  }, [zoom]);

  /** The grip point under a click (083): the first mesh of the weapon hit by the ray, in the file's own units. */
  const pick = (event: ReactPointerEvent<HTMLCanvasElement>) => {
    const weapon = weaponRef.current;
    const asset = assetRef.current;
    const camera = cameraRef.current;
    if (!weapon || !asset || !camera || !pickRef.current) return;
    const rect = event.currentTarget.getBoundingClientRect();
    const ndc = new Vector2(((event.clientX - rect.left) / rect.width) * 2 - 1, -((event.clientY - rect.top) / rect.height) * 2 + 1);
    const raycaster = new Raycaster();
    raycaster.setFromCamera(ndc, camera);
    weapon.updateMatrixWorld(true);
    const hits = raycaster.intersectObject(weapon, true).filter((hit) => hit.object !== markerRef.current);
    if (hits.length === 0) return;
    const local = weapon.worldToLocal(hits[0].point.clone());
    pickRef.current(gripPointOf([local.x, local.y, local.z], { min: asset.min, size: [asset.size.x, asset.size.y, asset.size.z] }));
  };

  /** The distance between the two first pointers down (a pinch). */
  const pinchDistance = () => {
    const [a, b] = [...pointers.current.values()];
    return a && b ? Math.hypot(a.x - b.x, a.y - b.y) : 0;
  };
  const onPointerDown = (event: ReactPointerEvent<HTMLCanvasElement>) => {
    try {
      event.currentTarget.setPointerCapture(event.pointerId);
    } catch {
      // A pointer the browser does not know (synthetic events): the drag still works without the capture.
    }
    pointers.current.set(event.pointerId, { x: event.clientX, y: event.clientY });
    if (pointers.current.size === 2) pinch.current = { zoom: zoomRef.current, distance: pinchDistance() };
    drag.current = { x: event.clientX, y: event.clientY, startX: event.clientX, startY: event.clientY, at: performance.now() };
  };
  const onPointerMove = (event: ReactPointerEvent<HTMLCanvasElement>) => {
    if (pointers.current.has(event.pointerId)) pointers.current.set(event.pointerId, { x: event.clientX, y: event.clientY });
    if (pinch.current && pointers.current.size >= 2) {
      onZoomRef.current?.(pinchZoom(pinch.current.zoom, pinch.current.distance, pinchDistance()));
      return;
    }
    if (drag.current === null) return;
    const dx = event.clientX - drag.current.x;
    const dy = event.clientY - drag.current.y;
    if (editableRef.current) {
      orbit.current.yaw -= dx * DRAG_TURN;
      orbit.current.pitch = Math.min(PITCH_LIMIT, Math.max(-PITCH_LIMIT, orbit.current.pitch + dy * DRAG_TURN));
      placeCamera();
    } else if (stage.current) {
      stage.current.rotation.y += dx * DRAG_TURN;
    }
    drag.current.x = event.clientX;
    drag.current.y = event.clientY;
  };
  const onPointerUp = (event: ReactPointerEvent<HTMLCanvasElement>) => {
    if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);
    const press = drag.current;
    drag.current = null;
    const pinched = pinch.current !== null;
    pointers.current.delete(event.pointerId);
    if (pointers.current.size < 2) pinch.current = null;
    if (!press || pinched || !editableRef.current) return;
    const moved = Math.hypot(event.clientX - press.startX, event.clientY - press.startY);
    if (moved < CLICK_PIXELS && performance.now() - press.at < CLICK_MS) pick(event);
  };
  const onPointerCancel = (event: ReactPointerEvent<HTMLCanvasElement>) => {
    if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);
    pointers.current.delete(event.pointerId);
    if (pointers.current.size < 2) pinch.current = null;
    drag.current = null;
  };

  return (
    <canvas ref={canvasRef} className={`stm-model-preview${editable ? ' stm-weapon-editable' : ''}`} role="img" aria-label={label}
      onPointerDown={onPointerDown} onPointerMove={onPointerMove} onPointerUp={onPointerUp} onPointerCancel={onPointerCancel} />
  );
};

export default WeaponPreview;
