# Contract: preview and socket modules (085)

## `lib/socketFrame.ts` (pure)

```ts
export interface HandBones {
  side: 'right' | 'left';
  hand: Vec3;
  middle1?: Vec3; index1?: Vec3; pinky1?: Vec3; thumb1?: Vec3; foreArm?: Vec3;
  /** The hips (083→085): the side of the palm away from the body is the back of the hand. */
  hips?: Vec3;
}
/** Measured on the pose the bones are in (the idle pose, since 085). */
export const handFrame: (bones: HandBones, model: ModelAxes) => Frame;
export const FORWARD_FALLBACK_DOT = 0.9;   // fingers this close to forward → the thumb rule
export const OUTWARD_MIN_DOT = 0.3;        // palm normal this close to vertical (vs the hips→hand direction) → model up
```

Rules:
- `attack` = fingers (`Middle1 − Hand`; fallback `Hand − ForeArm`; fallback the character's side).
- `up` = `orthogonalize(model.forward, fingers)`; when `|dot(fingers, forward)| > FORWARD_FALLBACK_DOT`, the 083 rule
  (`palmNormal × fingers` toward the thumb, else forward).
- wanted `face` = palm normal (from `Index1`/`Pinky1`) oriented so that `dot(face, horizontal(hand − hips)) > 0` when
  `|dot| > OUTWARD_MIN_DOT`, else so that `dot(face, model.up) > 0`; without finger bones: the character's side axis
  (outward) when `hips` is known, else `model.up`.

Tests (`socketFrame.test.ts`): the T-pose hands keep the 083 results; a hanging hand (fingers down-forward, thumb
inward, palm forward) gives `up` forward-tilted-up, `attack` down, `face` outward; the fingers-forward fallback; the
hips-less fallback.

## `components/story/socketAnchors.ts`

Unchanged API (`measureSockets`, `socketsOf`, `forgetSockets`); `measure` passes the hips' world position to
`handFrame`. The doc comment says the callers measure on the idle pose.

## `components/story/weaponSockets.ts`

```ts
export interface WeaponSocketsSync {
  sync: (model, characterHeight, wanted) => void;
  /** Hangs the carried weapons again on freshly measured anchors (the idle pose changed). */
  refresh: (model: Object3D, characterHeight: number) => void;
  reset: () => void;
}
```

## `ModelPreview` / `modelSet`

- `ModelPreview.applyClips(choices)`: after the actions are built — `measureAtIdle()`: the idle action (or nothing)
  played at time 0 with `mixer.update(0)`, `forgetSockets(model)`, `measureSockets(model)`, `onSockets(socketsOf(model))`,
  `weaponSockets.refresh(model, height)`; then `show(...)` as before (rest pose on the "3D" tab).
- New props `zoom?: number` (1…`PREVIEW_ZOOM_MAX`, default 1) and `onZoom?: (zoom: number) => void` (wheel, pinch).
  `placeCamera()` divides the distance by `zoom`.
- `modelSet.animate(entry, fall)`: after building the actions, the same measure at idle, then
  `entry.hands.refresh(object, height)` when the entry already carries weapons.

## `WeaponPreview` / `WeaponStage`

- `WeaponPreview` props `zoom?`, `onZoom?` (wheel, pinch; the camera radius `ORBIT_RADIUS / zoom` in edit mode, the
  fixed camera distance `/ zoom` otherwise).
- `WeaponStage` holds the zoom (reset on `url`) and renders `ZoomButtons`.

## `components/ui/ZoomButtons.tsx`

```tsx
<ZoomButtons zoom={zoom} min={1} max={PREVIEW_ZOOM_MAX} onChange={setZoom} labelIn labelOut />
```
Two 32 px icon buttons (`PlusIcon`/`MinusIcon`, `title` + `aria-label` `preview.zoomIn`/`preview.zoomOut`), absolutely
positioned in the stage's top-right corner (`.stm-stage-zoom`), disabled at the limits; a step multiplies by
`PREVIEW_ZOOM_STEP` = 1.5.

## `lib/previewZoom.ts` (pure)

```ts
export const PREVIEW_ZOOM_MIN = 1; export const PREVIEW_ZOOM_MAX = 4; export const PREVIEW_ZOOM_STEP = 1.5;
export const clampZoom: (zoom: number) => number;
export const wheelZoom: (zoom: number, deltaY: number) => number;      // × 1.1^(−deltaY/100)
export const pinchZoom: (startZoom: number, startDistance: number, distance: number) => number;
export const stepZoom: (zoom: number, direction: 1 | -1) => number;
```

## `ModelField` layout

```
<div className={`stm-model-layout${section === 'weapons' ? ' is-side' : ''}`}>
  <div className="stm-model-card">…preview, timeline, generate…</div>
  <div className="stm-model-controls">…the section's controls (scale / animation select / sockets + size + fine)…</div>
</div>
```
CSS: `.stm-model-layout { display: flex; flex-wrap: wrap; gap: 1rem; align-items: flex-start }`,
`.stm-model-layout.is-side .stm-model-controls { flex: 1 1 320px; min-width: 0 }`, the card keeps `max-width: 352px`
and loses its `margin: 0 auto` inside `.is-side` on `min-width: 768px`. The fine block starts open on `md+`.

## i18n (pt-BR, inserted as text)

`preview.zoomIn` "Aproximar", `preview.zoomOut` "Afastar"; `tokens.weapons.help` no longer says the fine adjustment is
below.
