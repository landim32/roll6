# Research: Melhorias das armas no token (085)

## R1 — Why the axe points sideways in the ogre's hand

**Investigation** (scripts kept in the session scratchpad: `glbhands.py` reads a `.glb` and prints the Mixamo hand
bones; `zz-sockets.test.ts` loads the real rigs through `parseModel`/`instantiate`/`measureSockets`/`attachWeapons` in
Node — the textures stripped by `stripglb.py` so `GLTFLoader` parses in Node — and prints the socket axes during the
idle clip; a local page showed the ogre and the elf with a sword in each hand, at rest and animated).

**Findings**:
- Both the ogre (`gorbag-o-moedor/ogre.glb`) and the elf are full Mixamo rigs (65 joints, finger bones, T-pose,
  palms down, thumbs forward). On the rest pose the 083 frame is exactly as designed: `up` = +Z (forward, toward the
  thumb), `attack` = −X (the fingers), `face` = +Y (the back of the hand). The pure math and the bone-space conversion
  are right; the Node measurement and the generated-rig tests agree.
- The problem is the **idle animation**. In both files' idle clips the hand hangs slightly supinated: the fingers point
  down and forward (0.02, −0.92, 0.40) but the thumb points **inward and forward** (ogre: (0.67, −0.40, 0.62) for the
  right hand, whose outward side is −X). The socket is rigid in bone space, so the fist's tunnel — measured toward the
  thumb at rest — follows the hand and ends up pointing **inward, horizontal** (ogre: `up` = (0.49, 0.41, 0.77); the
  two swords cross in front of the belly on the local page, which is the user's print). Anatomically that is where a
  hammer grip would point with that wrist; visually it is wrong, because game idle animations are not "holding"
  poses and nobody wants the blade across the belly.
- Models without finger bones were not the cause (the ogre has them); the fallback stays as it is.

**Decision**: the **hand sockets are measured on the idle pose**, not on the rest pose, with a rule that no longer
follows the thumb:
- `attack` = the fingers (`Middle1 − Hand`, fallback the forearm) — in the idle pose they point down, so the edge
  points down, as a hanging sword does;
- `up` = the **model's forward** made orthogonal to the fingers (tilted up by the forearm's angle; when the fingers are
  within ~25° of forward, the old thumb rule is the fallback) — the blade points forward whatever the wrist's
  supination;
- `face` (wanted) = the back of the hand: the palm normal turned **away from the body** (the horizontal direction from
  the hips to the hand; when that is ambiguous, within ~17° of vertical, the model's up — the T-pose case) — a shield
  faces outward in the idle pose.
- On the rest pose (a model with no idle clip) the same rule gives the 083 result (forward, fingers, back of the hand).

The back and holster sockets are measured on the same pose (the torso at idle ≈ rest; nothing changes for them).

**Where**: `measureSockets(model)` stays pose-agnostic (it measures the pose the bones are in); the callers measure at
the idle clip's first frame — `ModelPreview.applyClips` (after the actions are built: play idle, `mixer.update(0)`,
`forgetSockets`, `measureSockets`, then `show(...)` restores whatever the tab shows) and `modelSet.animate` (same, before
the state logic) — and ask `weaponSockets` to **re-attach** (`refresh(model, height)`) when a measure happened after
the weapons were hung (library animations arriving, another idle chosen in the form). A model whose idle resolves to
none measures on its rest pose.

**Alternatives considered**:
- Keep the thumb rule and tell users to fix it with the fine adjustment: that is the 082 problem again, per token.
- Measure on the rest pose with `up` = forward: identical to today at rest; the supinated idle wrist still turns the
  blade inward (the socket is rigid in bone space).
- A per-frame correction (keep the blade forward whatever the hand does): the weapon would no longer follow the hand;
  rejected (083 R4: nothing per frame).

## R2 — Zoom of the previews

**Decision**: a **controlled `zoom`** on both previews — `ModelPreview` (props `zoom`, `onZoom`) and `WeaponPreview`
(same) — as a factor 1…`PREVIEW_ZOOM_MAX` = 4 that divides the camera's distance to its target (`applySize` becomes
`placeCamera(factor, zoom)`; the target stays at the waist height `CAMERA_TARGET_Y × framing`, where the hands are, so
zooming in frames the hands). Inputs:
- the **wheel** over the canvas: a native `wheel` listener added with `{ passive: false }` so `preventDefault()` stops
  the page from scrolling (React's `onWheel` is passive); each tick multiplies by `1.1^(−deltaY/100)`;
- **pinch**: the two first pointers tracked in the existing pointer handlers; the ratio of the distance between them
  since the pinch began scales the zoom (the one-finger turn is suspended while two pointers are down);
- **buttons** "+"/"−" (`ZoomButtons`, 32 px, `PlusIcon`/`MinusIcon`, over the stage's corner, disabled at the limits).
The state lives in the owner (`ModelField` — one state for the three tabs, reset when `previewUrl` changes, FR-007;
`WeaponStage` — reset when the file changes), so it survives a tab or state switch and a remount of the canvas does
not lose it. Zooming does not touch the turntable, the raycast pick (it uses the camera as it is) or the pose photo
(its own orthographic camera).

**Alternative**: a free orbit camera (`OrbitControls`): more than the spec asks, and it would change the turntable's
behaviour and the "Gerar imagem" framing.

## R3 — Controls beside the preview on desktop

**Decision**: `ModelField` wraps the preview card and the section's controls in `.stm-model-layout` (flex, `gap`,
`flex-wrap`). In the "weapons" section it gets `.is-side`: on `min-width: 768px` (the site's `md`, the menu's own
break) the card keeps its 352 px and the controls column takes the rest (`flex: 1 1 320px`), so the 800 px token
modal shows them side by side; narrower, the controls wrap under the card. The card stays at the same tree position
in every section (060/082), so switching tabs or resizing never remounts the preview (FR-013). On the side layout the
"Ajuste fino" starts **open** (initial `fineOpen` from `matchMedia('(min-width: 768px)')`; the toggle stays for
phones). The "3D" and "Animação" sections keep their controls under the card as today.

**Alternative**: a two-column layout for the three sections: nothing in "3D"/"Animação" needs it, and their controls
are longer than the card.
