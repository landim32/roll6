import { useEffect, useRef } from 'react';
import type { PointerEvent as ReactPointerEvent } from 'react';
import {
  Box3, CircleGeometry, Clock, DirectionalLight, Group, HemisphereLight, Mesh, MeshBasicMaterial, PerspectiveCamera, Scene,
  Vector3, WebGLRenderer,
} from 'three';
import { cloneWeapon, loadWeapon } from '../story/loadWeapon';

interface WeaponPreviewProps {
  /** The weapon's file: a stored model's presigned URL, or a blob URL of a file just picked. */
  url: string;
  label: string;
  onError: () => void;
}

const PREVIEW_SIZE = 1.6;
const TURN_SPEED = 0.6;
const DRAG_TURN = 0.01;

/**
 * Preview of a library weapon (082): the weapon alone over a disc, its longest side fitted to the stage, turning slowly
 * (a drag turns it by hand). Lazy, like the token's model preview — its own small three.js scene.
 */
export const WeaponPreview = ({ url, label, onError }: WeaponPreviewProps) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const stage = useRef<Group | null>(null);
  const drag = useRef<number | null>(null);
  const errorRef = useRef(onError);
  errorRef.current = onError;

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
    const camera = new PerspectiveCamera(32, 1, 0.05, 100);
    camera.position.set(0, 1.4, 4.2);
    camera.lookAt(0, 0.8, 0);

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

    let cancelled = false;
    void loadWeapon(url).then((asset) => {
      if (cancelled) return;
      if (!asset) {
        errorRef.current();
        return;
      }
      const weapon = cloneWeapon(asset);
      const longest = Math.max(asset.size.x, asset.size.y, asset.size.z, 1e-6);
      weapon.scale.setScalar(PREVIEW_SIZE / longest);
      weapon.updateMatrixWorld(true);
      // Centered over the disc, resting on it.
      const box = new Box3().setFromObject(weapon, true);
      const center = box.getCenter(new Vector3());
      weapon.position.set(-center.x, -box.min.y, -center.z);
      turntable.add(weapon);
    });

    const clock = new Clock();
    let frame = 0;
    const loop = () => {
      frame = requestAnimationFrame(loop);
      const delta = clock.getDelta();
      if (drag.current === null) turntable.rotation.y += TURN_SPEED * delta;
      renderer.render(scene, camera);
    };
    frame = requestAnimationFrame(loop);

    return () => {
      cancelled = true;
      cancelAnimationFrame(frame);
      observer.disconnect();
      stage.current = null;
      ground.geometry.dispose();
      (ground.material as MeshBasicMaterial).dispose();
      renderer.dispose();
    };
  }, [url]);

  const onPointerDown = (event: ReactPointerEvent<HTMLCanvasElement>) => {
    event.currentTarget.setPointerCapture(event.pointerId);
    drag.current = event.clientX;
  };
  const onPointerMove = (event: ReactPointerEvent<HTMLCanvasElement>) => {
    if (drag.current === null || !stage.current) return;
    stage.current.rotation.y += (event.clientX - drag.current) * DRAG_TURN;
    drag.current = event.clientX;
  };
  const onPointerUp = (event: ReactPointerEvent<HTMLCanvasElement>) => {
    if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);
    drag.current = null;
  };

  return (
    <canvas ref={canvasRef} className="stm-model-preview" role="img" aria-label={label}
      onPointerDown={onPointerDown} onPointerMove={onPointerMove} onPointerUp={onPointerUp} onPointerCancel={onPointerUp} />
  );
};

export default WeaponPreview;
