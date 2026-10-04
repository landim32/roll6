import { useCallback, useEffect, useRef, useState } from 'react';
import type { PointerEvent as ReactPointerEvent, WheelEvent as ReactWheelEvent } from 'react';
import { HEX_SIZE } from '../lib/hexGrid';
import type { Point } from '../lib/hexGrid';
import { followPose, FOV_STEP, initialCamera, stepCamera } from '../lib/storyCamera';
import type { CameraBlocked, CameraPose } from '../lib/storyCamera';

/** Walking speed (map px per second) and turning speed (radians per second). */
const WALK_SPEED = 5 * HEX_SIZE;
const TURN_SPEED = 1.8;
/** Radians per horizontally dragged pixel. */
const DRAG_TURN = 0.005;

export interface FollowedPiece {
  mapTokenId: number;
  center: Point;
  look: number;
}

interface UseStoryCameraOptions {
  /** Applies a pose to the scene (called on every change, outside React renders). */
  apply: (pose: CameraPose) => void;
  /** The scene exists: the current pose is applied as soon as it does. */
  active: boolean;
  blocked: CameraBlocked;
  columns: number;
  rows: number;
  /** The chosen character's piece on this map, or null (GM, no piece). */
  followed: FollowedPiece | null;
  fov: number;
  setFov: (fov: number) => void;
}

const isTyping = (target: EventTarget | null): boolean => {
  const element = target as HTMLElement | null;
  if (!element) return false;
  return element.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(element.tagName);
};

/** Keys held down → walk/strafe/turn axes (−1, 0, 1). */
const axes = (keys: Set<string>) => {
  const has = (...codes: string[]) => codes.some((code) => keys.has(code));
  return {
    forward: (has('KeyW', 'ArrowUp') ? 1 : 0) - (has('KeyS', 'ArrowDown') ? 1 : 0),
    strafe: (has('KeyD') ? 1 : 0) - (has('KeyA') ? 1 : 0),
    turn: (has('KeyE', 'ArrowRight') ? 1 : 0) - (has('KeyQ', 'ArrowLeft') ? 1 : 0),
  };
};

/**
 * Camera of the 3D view (034): starts behind the chosen character and follows its piece; keyboard (W/A/S/D, Q/E,
 * arrows), mouse drag (sideways) and the touch joystick walk and turn freely (letting go of the character); the wheel and a
 * pinch zoom through the field of view. Every rule lives in the pure `lib/storyCamera`.
 */
export const useStoryCamera = ({ apply, active, blocked, columns, rows, followed, fov, setFov }: UseStoryCameraOptions) => {
  const poseRef = useRef<CameraPose | null>(null);
  const [attached, setAttached] = useState(false);
  const keys = useRef(new Set<string>());
  const joystick = useRef({ x: 0, y: 0 });
  const drag = useRef<{ x: number; y: number } | null>(null);
  const touches = useRef(new Map<number, { x: number; y: number }>());
  const pinch = useRef<number | null>(null);
  const latest = useRef({ apply, blocked, fov, setFov });
  latest.current = { apply, blocked, fov, setFov };

  const setPose = useCallback((pose: CameraPose) => {
    poseRef.current = pose;
    latest.current.apply(pose);
    setAttached((prev) => (prev === pose.attached ? prev : pose.attached));
  }, []);

  // Start, and go to the new character whenever the chosen one changes (FR-010a/b/d).
  const followedId = followed?.mapTokenId ?? null;
  const followedRef = useRef(followed);
  followedRef.current = followed;
  useEffect(() => {
    const piece = followedRef.current;
    if (piece) setPose(followPose(piece.center, piece.look, latest.current.blocked));
    else if (!poseRef.current) setPose(initialCamera(null, columns, rows, latest.current.blocked));
    // The piece went away: stay where the camera is, free.
    else setPose({ ...poseRef.current, attached: false });
  }, [followedId, columns, rows, setPose]);

  // While attached, follow the piece when it moves or turns (someone else may move it, 017).
  const followedX = followed?.center.x;
  const followedY = followed?.center.y;
  const followedLook = followed?.look;
  useEffect(() => {
    const piece = followedRef.current;
    if (!piece || !poseRef.current?.attached) return;
    setPose(followPose(piece.center, piece.look, latest.current.blocked));
  }, [followedX, followedY, followedLook, setPose]);

  // Walls changed under the camera (map saved elsewhere): re-apply so nothing stands inside a wall.
  useEffect(() => {
    const piece = followedRef.current;
    if (piece && poseRef.current?.attached) setPose(followPose(piece.center, piece.look, blocked));
  }, [blocked, setPose]);

  const reattach = useCallback(() => {
    const piece = followedRef.current;
    if (piece) setPose(followPose(piece.center, piece.look, latest.current.blocked));
  }, [setPose]);

  // Re-apply on a new zoom, and once the scene exists.
  useEffect(() => {
    if (active && poseRef.current) latest.current.apply(poseRef.current);
  }, [fov, active]);

  // Keyboard + joystick, one step per animation frame.
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (isTyping(event.target) || event.ctrlKey || event.metaKey || event.altKey) return;
      if (!['KeyW', 'KeyA', 'KeyS', 'KeyD', 'KeyQ', 'KeyE', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(event.code)) return;
      // A window opened over the map keeps its own keys.
      if (document.querySelector('[role="dialog"]')) return;
      keys.current.add(event.code);
      event.preventDefault();
    };
    const onKeyUp = (event: KeyboardEvent) => keys.current.delete(event.code);
    const onBlur = () => keys.current.clear();
    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    window.addEventListener('blur', onBlur);

    let frame = 0;
    let last = performance.now();
    const tick = (now: number) => {
      frame = requestAnimationFrame(tick);
      const dt = Math.min(0.1, (now - last) / 1000);
      last = now;
      const pose = poseRef.current;
      if (!pose) return;
      const held = axes(keys.current);
      const forward = (held.forward - joystick.current.y) * WALK_SPEED * dt;
      const strafe = (held.strafe + joystick.current.x) * WALK_SPEED * dt;
      const turn = held.turn * TURN_SPEED * dt;
      if (forward === 0 && strafe === 0 && turn === 0) return;
      setPose(stepCamera(pose, { forward, strafe, turn }, latest.current.blocked));
    };
    frame = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
      window.removeEventListener('blur', onBlur);
    };
  }, [setPose]);

  // Mouse/finger drag turns sideways; two fingers pinch the zoom.
  const onPointerDown = useCallback((event: ReactPointerEvent<HTMLCanvasElement>) => {
    event.currentTarget.setPointerCapture(event.pointerId);
    event.currentTarget.focus();
    touches.current.set(event.pointerId, { x: event.clientX, y: event.clientY });
    drag.current = { x: event.clientX, y: event.clientY };
    pinch.current = null;
  }, []);

  const onPointerMove = useCallback((event: ReactPointerEvent<HTMLCanvasElement>) => {
    if (!touches.current.has(event.pointerId)) return;
    touches.current.set(event.pointerId, { x: event.clientX, y: event.clientY });
    if (touches.current.size >= 2) {
      const [a, b] = [...touches.current.values()];
      const distance = Math.hypot(a.x - b.x, a.y - b.y);
      if (pinch.current !== null && distance > 0) {
        const { fov: current, setFov: change } = latest.current;
        change(current * (pinch.current / distance));
      }
      pinch.current = distance;
      return;
    }
    const pose = poseRef.current;
    if (!drag.current || !pose) return;
    // Only the horizontal drag turns the camera: it never looks up or down (034).
    const dx = event.clientX - drag.current.x;
    drag.current = { x: event.clientX, y: event.clientY };
    if (dx === 0) return;
    setPose(stepCamera(pose, { turn: dx * DRAG_TURN }, latest.current.blocked));
  }, [setPose]);

  const onPointerUp = useCallback((event: ReactPointerEvent<HTMLCanvasElement>) => {
    touches.current.delete(event.pointerId);
    if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);
    if (touches.current.size < 2) pinch.current = null;
    if (touches.current.size === 0) drag.current = null;
  }, []);

  const onWheel = useCallback((event: ReactWheelEvent<HTMLCanvasElement>) => {
    const { fov: current, setFov: change } = latest.current;
    change(current + (event.deltaY > 0 ? FOV_STEP / 2 : -FOV_STEP / 2));
  }, []);

  const setJoystick = useCallback((x: number, y: number) => {
    joystick.current = { x, y };
  }, []);

  return {
    attached,
    reattach,
    setJoystick,
    pointerHandlers: { onPointerDown, onPointerMove, onPointerUp, onPointerCancel: onPointerUp, onWheel },
  };
};

export default useStoryCamera;
