import { useCallback, useEffect, useRef, useState } from 'react';
import type { PointerEvent as ReactPointerEvent, WheelEvent as ReactWheelEvent } from 'react';
import { HEX_SIZE } from '../lib/hexGrid';
import type { Point } from '../lib/hexGrid';
import { followPose, FOV_STEP, initialCamera, stepCamera } from '../lib/storyCamera';
import type { CameraBlocked, CameraPose } from '../lib/storyCamera';
import { startWalker, stepWalker, walkCamera, withDistance, zoomWalker } from '../lib/walker';
import type { WalkerState } from '../lib/walker';

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

/**
 * Walking the chosen character in free mode (055): while set, every movement input moves the character instead of the
 * camera, which stays locked behind it. `key` says when to start again from the piece (the piece moved, turned or lay
 * down, another map or character): a new key throws the walk away. Nothing here leaves the browser.
 */
export interface WalkOptions {
  key: string;
  center: Point;
  look: number;
  /** Where the character may not stand (walls, edge, other pieces). */
  blocked: CameraBlocked;
  /** Called with every new state of the walk, and with null when it ends. */
  onWalker: (walker: WalkerState | null) => void;
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
  /** Free mode: walk the character (055); null = the camera of before. */
  walk?: WalkOptions | null;
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
export const useStoryCamera = ({ apply, active, blocked, columns, rows, followed, fov, setFov, walk = null }: UseStoryCameraOptions) => {
  const poseRef = useRef<CameraPose | null>(null);
  const [attached, setAttached] = useState(false);
  const keys = useRef(new Set<string>());
  const joystick = useRef({ x: 0, y: 0 });
  const drag = useRef<{ x: number; y: number } | null>(null);
  const touches = useRef(new Map<number, { x: number; y: number }>());
  const pinch = useRef<number | null>(null);
  const latest = useRef({ apply, blocked, fov, setFov, walk });
  latest.current = { apply, blocked, fov, setFov, walk };
  /** The walk in progress (055), or null. */
  const walkerRef = useRef<WalkerState | null>(null);
  /** The camera distance chosen while walking, kept when the walk starts again from the piece. */
  const walkDistance = useRef<number | undefined>(undefined);

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
    if (!piece || !poseRef.current?.attached || walkerRef.current) return;
    setPose(followPose(piece.center, piece.look, latest.current.blocked));
  }, [followedX, followedY, followedLook, setPose]);

  // Walls changed under the camera (map saved elsewhere): re-apply so nothing stands inside a wall.
  useEffect(() => {
    if (walkerRef.current) {
      setPose(walkCamera(walkerRef.current, blocked));
      return;
    }
    const piece = followedRef.current;
    if (piece && poseRef.current?.attached) setPose(followPose(piece.center, piece.look, blocked));
  }, [blocked, setPose]);

  /** A new state of the walk: the camera goes behind it and the view hears about it. */
  const setWalker = useCallback((walker: WalkerState) => {
    walkerRef.current = walker;
    walkDistance.current = walker.distance;
    setPose(walkCamera(walker, latest.current.blocked));
    latest.current.walk?.onWalker(walker);
  }, [setPose]);

  // The walk starts from the piece whenever its key changes, and ends (back to the camera of before) when it goes away.
  const walkKey = walk?.key ?? null;
  useEffect(() => {
    const current = latest.current.walk;
    if (current) {
      setWalker(startWalker(current.center, current.look, walkDistance.current));
      return;
    }
    if (!walkerRef.current) return;
    walkerRef.current = null;
    const piece = followedRef.current;
    if (piece) setPose(followPose(piece.center, piece.look, latest.current.blocked));
    else if (poseRef.current) setPose({ ...poseRef.current, attached: false });
  }, [walkKey, setWalker, setPose]);

  // Tell the view the walk ended, also when the component goes away.
  useEffect(() => {
    const ending = latest.current.walk;
    return () => ending?.onWalker(null);
  }, [walkKey]);

  /** The zoom while walking: the camera comes closer (steps < 0) or goes farther (steps > 0). */
  const zoomWalk = useCallback((steps: number) => {
    const walker = walkerRef.current;
    if (walker) setWalker(zoomWalker(walker, steps));
  }, [setWalker]);

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
      const walker = walkerRef.current;
      const walking = latest.current.walk;
      if (walker && walking) {
        // Walking (055): forward/back walk, the sides (and the joystick's horizontal axis) turn — no side steps.
        const clamp = (value: number) => Math.max(-1, Math.min(1, value));
        const next = stepWalker(walker, {
          forward: clamp(held.forward - joystick.current.y),
          turn: clamp(held.turn + held.strafe + joystick.current.x),
        }, dt, walking.blocked);
        if (next.x !== walker.x || next.z !== walker.z || next.yaw !== walker.yaw || next.moving !== walker.moving) setWalker(next);
        return;
      }
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
  }, [setPose, setWalker]);

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
        const walker = walkerRef.current;
        if (walker) {
          // Fingers apart bring the camera closer, like the zoom of the field of view.
          setWalker(withDistance(walker, walker.distance * (pinch.current / distance)));
        } else {
          const { fov: current, setFov: change } = latest.current;
          change(current * (pinch.current / distance));
        }
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
    const walker = walkerRef.current;
    if (walker) {
      setWalker({ ...walker, yaw: walker.yaw + dx * DRAG_TURN });
      return;
    }
    setPose(stepCamera(pose, { turn: dx * DRAG_TURN }, latest.current.blocked));
  }, [setPose, setWalker]);

  const onPointerUp = useCallback((event: ReactPointerEvent<HTMLCanvasElement>) => {
    touches.current.delete(event.pointerId);
    if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);
    if (touches.current.size < 2) pinch.current = null;
    if (touches.current.size === 0) drag.current = null;
  }, []);

  const onWheel = useCallback((event: ReactWheelEvent<HTMLCanvasElement>) => {
    if (walkerRef.current) {
      zoomWalk(event.deltaY > 0 ? 0.5 : -0.5);
      return;
    }
    const { fov: current, setFov: change } = latest.current;
    change(current + (event.deltaY > 0 ? FOV_STEP / 2 : -FOV_STEP / 2));
  }, [zoomWalk]);

  const setJoystick = useCallback((x: number, y: number) => {
    joystick.current = { x, y };
  }, []);

  return {
    attached,
    reattach,
    /** The zoom while walking (055): the map controls' +/− call it instead of changing the field of view. */
    zoomWalk,
    setJoystick,
    pointerHandlers: { onPointerDown, onPointerMove, onPointerUp, onPointerCancel: onPointerUp, onWheel },
  };
};

export default useStoryCamera;
