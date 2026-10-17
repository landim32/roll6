import { useCallback, useEffect, useRef, useState } from 'react';
import type { PointerEvent as ReactPointerEvent, WheelEvent as ReactWheelEvent } from 'react';
import { HEX_SIZE } from '../lib/hexGrid';
import type { Point } from '../lib/hexGrid';
import { DRAG_TURN, easeBack, foldIntoCharacter, orbitBy, pitchBy } from '../lib/orbitCamera';
import { clampPitch, followYawPose, FOV_STEP, initialCamera, lookToYaw, PITCH_DEFAULT, stepCamera } from '../lib/storyCamera';
import type { CameraPose, CameraWorld } from '../lib/storyCamera';
import { startWalker, stepWalker, walkCamera, withDistance, zoomWalker } from '../lib/walker';
import type { WalkerState } from '../lib/walker';

/** Walking speed (map px per second), turning and tilting speed (radians per second). */
const WALK_SPEED = 5 * HEX_SIZE;
const TURN_SPEED = 1.8;
const PITCH_KEY_SPEED = 1.2;

export interface FollowedPiece {
  mapTokenId: number;
  center: Point;
  look: number;
  /** Exact direction (070), when a 3D walk left the piece facing between two sides; else `look`'s. */
  yaw?: number;
}

/** The direction the camera follows a piece from: its exact one (070), else its side's. */
const pieceYaw = (piece: FollowedPiece): number => piece.yaw ?? lookToYaw(piece.look);

/**
 * Walking the chosen character in free mode (055): while set, every movement input moves the character instead of the
 * camera, which stays locked behind it. `key` says when to start again from the piece (the piece moved, turned or lay
 * down, another map or character): a new key throws the walk away. The terrain it walks on is the camera's world.
 */
export interface WalkOptions {
  key: string;
  center: Point;
  look: number;
  /** Exact direction to start from (070); else `look`'s. */
  yaw?: number;
  /** Called with every new state of the walk, and with null when it ends. */
  onWalker: (walker: WalkerState | null) => void;
}

interface UseStoryCameraOptions {
  /** Applies a pose to the scene (called on every change, outside React renders). */
  apply: (pose: CameraPose) => void;
  /** The scene exists: the current pose is applied as soon as it does. */
  active: boolean;
  /** The terrain of the 3D mask and the edge of the map (081). */
  world: CameraWorld;
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

const KEYS = ['KeyW', 'KeyA', 'KeyS', 'KeyD', 'KeyQ', 'KeyE', 'KeyR', 'KeyF', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'];

/** Keys held down → walk/strafe/turn/tilt axes (−1, 0, 1). */
const axes = (keys: Set<string>) => {
  const has = (...codes: string[]) => codes.some((code) => keys.has(code));
  return {
    forward: (has('KeyW', 'ArrowUp') ? 1 : 0) - (has('KeyS', 'ArrowDown') ? 1 : 0),
    strafe: (has('KeyD') ? 1 : 0) - (has('KeyA') ? 1 : 0),
    turn: (has('KeyE', 'ArrowRight') ? 1 : 0) - (has('KeyQ', 'ArrowLeft') ? 1 : 0),
    // 081: R looks up, F looks down.
    pitch: (has('KeyR') ? 1 : 0) - (has('KeyF') ? 1 : 0),
  };
};

/** What the mouse is doing over the view (068): left = orbit, right = steer, both = walk forward. */
type MouseMode = 'orbit' | 'steer' | 'walk' | null;

/** `PointerEvent.buttons` → what the drag does; a finger or a pen counts as the left button. */
const mouseModeOf = (event: { buttons: number; pointerType: string }): MouseMode => {
  if (event.pointerType !== 'mouse') return event.buttons ? 'orbit' : null;
  const left = (event.buttons & 1) !== 0;
  const right = (event.buttons & 2) !== 0;
  if (left && right) return 'walk';
  if (right) return 'steer';
  return left ? 'orbit' : null;
};

/**
 * Camera of the 3D view (034): starts behind the chosen character and follows its piece. Around the character it works
 * like World of Warcraft's (068): a left drag (one finger) circles the camera around it without turning it, and the
 * camera stays there while the character stands still; when it walks or turns the camera eases back behind it; a right
 * drag turns the character to where the camera looks, and both buttons walk forward. Since 081 the vertical part of
 * any drag — and the keys R/F — tilt the camera up and down. Keyboard (W/A/S/D, Q/E, arrows) and the touch joystick
 * walk the character in free mode (055) — on the terrain, up steps, never up taller blocks — or, otherwise, walk and
 * turn the camera freely (letting go of the character); the wheel and a pinch zoom. Every rule lives in the pure
 * `lib/storyCamera`, `lib/orbitCamera` and `lib/walker`.
 */
export const useStoryCamera = ({ apply, active, world, columns, rows, followed, fov, setFov, walk = null }: UseStoryCameraOptions) => {
  const poseRef = useRef<CameraPose | null>(null);
  const [attached, setAttached] = useState(false);
  const keys = useRef(new Set<string>());
  const joystick = useRef({ x: 0, y: 0 });
  const drag = useRef<{ x: number; y: number } | null>(null);
  const touches = useRef(new Map<number, { x: number; y: number }>());
  const pinch = useRef<number | null>(null);
  const latest = useRef({ apply, world, fov, setFov, walk });
  latest.current = { apply, world, fov, setFov, walk };
  /** The walk in progress (055), or null. */
  const walkerRef = useRef<WalkerState | null>(null);
  /** The camera distance chosen while walking, kept when the walk starts again from the piece. */
  const walkDistance = useRef<number | undefined>(undefined);
  /** The camera's angle around the character (068): 0 = behind it. */
  const orbitRef = useRef(0);
  /** How far up or down the camera around the character looks (081). */
  const pitchRef = useRef(PITCH_DEFAULT);
  /** What the mouse buttons held over the view do (068). */
  const mouse = useRef<MouseMode>(null);

  const setPose = useCallback((pose: CameraPose) => {
    poseRef.current = pose;
    latest.current.apply(pose);
    setAttached((prev) => (prev === pose.attached ? prev : pose.attached));
  }, []);

  const follow = useCallback((piece: FollowedPiece) =>
    followYawPose(piece.center, pieceYaw(piece), latest.current.world, orbitRef.current, pitchRef.current), []);

  // Start, and go to the new character whenever the chosen one changes (FR-010a/b/d).
  const followedId = followed?.mapTokenId ?? null;
  const followedRef = useRef(followed);
  followedRef.current = followed;
  useEffect(() => {
    const piece = followedRef.current;
    orbitRef.current = 0;
    pitchRef.current = PITCH_DEFAULT;
    if (piece) setPose(follow(piece));
    else if (!poseRef.current) setPose(initialCamera(null, columns, rows, latest.current.world));
    // The piece went away: stay where the camera is, free.
    else setPose({ ...poseRef.current, attached: false });
  }, [followedId, columns, rows, setPose, follow]);

  // While attached, follow the piece when it moves or turns (someone else may move it, 017).
  const followedX = followed?.center.x;
  const followedY = followed?.center.y;
  const followedLook = followed?.look;
  const followedYaw = followed?.yaw;
  useEffect(() => {
    const piece = followedRef.current;
    if (!piece || !poseRef.current?.attached || walkerRef.current) return;
    // Someone moved or turned the piece: the camera goes back behind it (068).
    orbitRef.current = 0;
    pitchRef.current = PITCH_DEFAULT;
    setPose(follow(piece));
  }, [followedX, followedY, followedLook, followedYaw, setPose, follow]);

  // The terrain changed under the camera (another mask, map saved elsewhere): re-apply so nothing stands inside a block.
  useEffect(() => {
    if (walkerRef.current) {
      setPose(walkCamera(walkerRef.current, world, orbitRef.current, pitchRef.current));
      return;
    }
    const piece = followedRef.current;
    if (piece && poseRef.current?.attached) setPose(follow(piece));
  }, [world, setPose, follow]);

  /** A new state of the walk: the camera goes behind it and the view hears about it. */
  const setWalker = useCallback((walker: WalkerState) => {
    walkerRef.current = walker;
    walkDistance.current = walker.distance;
    setPose(walkCamera(walker, latest.current.world, orbitRef.current, pitchRef.current));
    latest.current.walk?.onWalker(walker);
  }, [setPose]);

  // The walk starts from the piece whenever its key changes, and ends (back to the camera of before) when it goes away.
  const walkKey = walk?.key ?? null;
  useEffect(() => {
    const current = latest.current.walk;
    orbitRef.current = 0;
    pitchRef.current = PITCH_DEFAULT;
    if (current) {
      setWalker(startWalker(current.center, current.look, walkDistance.current, current.yaw, latest.current.world.terrain));
      return;
    }
    if (!walkerRef.current) return;
    walkerRef.current = null;
    const piece = followedRef.current;
    if (piece) setPose(follow(piece));
    else if (poseRef.current) setPose({ ...poseRef.current, attached: false });
  }, [walkKey, setWalker, setPose, follow]);

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
    orbitRef.current = 0;
    pitchRef.current = PITCH_DEFAULT;
    if (piece) setPose(follow(piece));
  }, [setPose, follow]);

  // Re-apply on a new zoom, and once the scene exists.
  useEffect(() => {
    if (active && poseRef.current) latest.current.apply(poseRef.current);
  }, [fov, active]);

  /** Tilts the camera by `delta` radians, wherever it is (081). */
  const tilt = useCallback((delta: number) => {
    const pose = poseRef.current;
    if (!pose || delta === 0) return;
    const walker = walkerRef.current;
    if (walker) {
      pitchRef.current = clampPitch(pitchRef.current + delta);
      setWalker(walker);
      return;
    }
    const piece = followedRef.current;
    if (piece && pose.attached) {
      pitchRef.current = clampPitch(pitchRef.current + delta);
      setPose(follow(piece));
      return;
    }
    setPose(stepCamera(pose, { pitch: delta }, latest.current.world));
  }, [setPose, setWalker, follow]);

  // Keyboard + joystick, one step per animation frame.
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (isTyping(event.target) || event.ctrlKey || event.metaKey || event.altKey) return;
      if (!KEYS.includes(event.code)) return;
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
      if (held.pitch !== 0) tilt(held.pitch * PITCH_KEY_SPEED * dt);
      const walker = walkerRef.current;
      const walking = latest.current.walk;
      if (walker && walking) {
        // Walking (055): forward/back walk, the sides (and the joystick's horizontal axis) turn — no side steps.
        // Both mouse buttons walk forward where the camera looks (068).
        const clamp = (value: number) => Math.max(-1, Math.min(1, value));
        const input = {
          forward: clamp(held.forward - joystick.current.y + (mouse.current === 'walk' ? 1 : 0)),
          turn: clamp(held.turn + held.strafe + joystick.current.x),
        };
        // Walking or turning swings the camera back behind the character; standing still it stays where it was put.
        const orbit = input.forward !== 0 || input.turn !== 0 ? easeBack(orbitRef.current, dt) : orbitRef.current;
        const orbitChanged = orbit !== orbitRef.current;
        orbitRef.current = orbit;
        // Stepped every frame, even without input: the feet still climb onto a step or fall off a ledge (081).
        const next = stepWalker(walker, input, dt, latest.current.world);
        if (orbitChanged || next.x !== walker.x || next.z !== walker.z || next.y !== walker.y || next.yaw !== walker.yaw
          || next.moving !== walker.moving) setWalker(next);
        return;
      }
      const forward = (held.forward - joystick.current.y) * WALK_SPEED * dt;
      const strafe = (held.strafe + joystick.current.x) * WALK_SPEED * dt;
      const turn = held.turn * TURN_SPEED * dt;
      if (forward === 0 && strafe === 0 && turn === 0) return;
      setPose(stepCamera(poseRef.current ?? pose, { forward, strafe, turn }, latest.current.world));
    };
    frame = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
      window.removeEventListener('blur', onBlur);
    };
  }, [setPose, setWalker, tilt]);

  /**
   * A new combination of mouse buttons (068). Entering "steer" or "walk" while walking turns the character to where
   * the camera looks, so it walks that way and the camera is behind it again.
   */
  const setMouse = useCallback((mode: MouseMode) => {
    const previous = mouse.current;
    mouse.current = mode;
    const walker = walkerRef.current;
    if (!walker || mode === previous || (mode !== 'steer' && mode !== 'walk') || orbitRef.current === 0) return;
    const folded = foldIntoCharacter(walker.yaw, orbitRef.current);
    orbitRef.current = folded.orbit;
    setWalker({ ...walker, yaw: folded.yaw });
  }, [setWalker]);

  // Mouse/finger drag circles the character (or turns the free camera) and tilts it; two fingers pinch the zoom.
  const onPointerDown = useCallback((event: ReactPointerEvent<HTMLCanvasElement>) => {
    event.currentTarget.setPointerCapture(event.pointerId);
    event.currentTarget.focus();
    touches.current.set(event.pointerId, { x: event.clientX, y: event.clientY });
    drag.current = { x: event.clientX, y: event.clientY };
    pinch.current = null;
    setMouse(mouseModeOf(event));
  }, [setMouse]);

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
    // A second button pressed (or released) during a drag only shows in a move: pointerdown fires for the first one.
    if (event.pointerType === 'mouse') setMouse(mouseModeOf(event));
    const dx = event.clientX - drag.current.x;
    const dy = event.clientY - drag.current.y;
    drag.current = { x: event.clientX, y: event.clientY };
    if (dx === 0 && dy === 0) return;
    // 081: the vertical part of the drag tilts the camera.
    if (dy !== 0) pitchRef.current = pitchBy(pitchRef.current, dy);
    const walker = walkerRef.current;
    if (walker) {
      // Right drag: the character turns and the camera stays behind it; left drag: the camera circles it (068).
      if (mouse.current === 'steer' || mouse.current === 'walk') setWalker({ ...walker, yaw: walker.yaw + dx * DRAG_TURN });
      else {
        orbitRef.current = orbitBy(orbitRef.current, dx);
        setWalker(walker);
      }
      return;
    }
    const piece = followedRef.current;
    if (piece && pose.attached) {
      // Following the piece outside free mode: either button circles the camera around it (068).
      orbitRef.current = orbitBy(orbitRef.current, dx);
      setPose(follow(piece));
      return;
    }
    setPose(stepCamera(pose, { turn: dx * DRAG_TURN, pitch: dy * DRAG_TURN }, latest.current.world));
  }, [setPose, setWalker, setMouse, follow]);

  const onPointerUp = useCallback((event: ReactPointerEvent<HTMLCanvasElement>) => {
    touches.current.delete(event.pointerId);
    if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);
    if (touches.current.size < 2) pinch.current = null;
    if (touches.current.size === 0) drag.current = null;
    setMouse(event.pointerType === 'mouse' ? mouseModeOf(event) : null);
  }, [setMouse]);

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
