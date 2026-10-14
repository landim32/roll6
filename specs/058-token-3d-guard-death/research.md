# Research: Token 3D — posição defensiva visível e animação de morte (058)

## R1 — Why the guard stance "was not done", and the fix (Q1 = A)

**Finding**: `ROLL6_GUARD` exists (057) and the deployed bundle offers "Posição defensiva (Roll6)". `createClipBuilder` builds every Roll6 clip through `fitToRig`. For each limb group, `fitToRig` keeps the largest amplitude in `[1, 0.6, 0.3, 0]` that tears ≤ 0.3% of the edges. The example orc binds about two thirds of its vertices to the hips, hands and feet included, so 055 already held its arms and legs still. The guard is defined almost entirely by arms (−55°, forearms −95°) and legs (thighs −20°/±10°, knees 35°). After fitting, what remains is the trunk lean (8°) and a 4% drop, which is indistinguishable from the idle clip.

**Decision**: `Roll6Clip.protect: boolean`.
- `ROLL6_IDLE` and `ROLL6_WALK` use `protect: true`, so behavior is unchanged.
- `ROLL6_GUARD` and the new `ROLL6_DEATH` use `protect: false`. They are built with no limits (`buildRoll6Clip(clip, root, height)`), at full amplitude, deformation accepted as the user chose.

**Rationale**: Q1 = A. Only the clips the user asked for change; idle/walk keep the protection that 055/056 needed for the walk.

**Alternatives considered**:
- Lower the tear threshold globally: rejected, because it would break idle/walk too.
- Express the guard through trunk and hips only (option B): rejected by the user.

## R2 — The deformation warning

**Decision**: for an unprotected clip, run the existing tear test once at full amplitude (`tornEdges(root, probe, built, times, height) > allowed`; the same `allowed` as `fitToRig`, all keyframes). Store `deforms` per clip in the builder's cache.
- `ModelClips` gains `deforms: boolean`, true when any clip chosen for the three states deforms.
- `reduced` stays for idle/walk.
- The preview shows `tokens.model.deforms` ("Esta animação pode deformar este modelo: o esqueleto dele prende braços e pernas ao quadril.") in the same `alert-warning` place as `tokens.model.reduced`.

**Rationale**: the user accepted deformation, and saying so explains a stretched shoulder. The test already exists and runs once per clip and model.

## R3 — `ROLL6_DEATH` keyframes

**Decision**: the clip is a fall on the back, in 1.4 s, defined in the character frame like the other clips. `loop: false`, `protect: false`, times `[0, 0.35, 0.8, 1.15, 1.4]`.

| Bone(s) | Motion |
|---|---|
| Hips (X) | `0 → -8 → -45 → -85 → -90`. A turn about −X takes "up" to −Z, so the head goes back. |
| Up legs (X) | `0 → -25 → -15 → 0 → 0`. The knees come forward as the body sinks, then the legs lie straight. |
| Legs (X) | `0 → 50 → 30 → 5 → 0`. The knees buckle, then straighten. |
| Spine / Spine1 (X) | Small forward curl while falling (`0 → 6 → 10 → 2 → 0`). |
| Neck / Head | Head tilts back on impact, then rests turned slightly to one side (Y 10°). |
| Arms | Out to the sides on the floor: Z ±70° at the end, with a small flail on the way (X `0 → -30 → -20 → 0 → 0`). |
| Forearms (X) | Slightly bent (`-10`). |

**Hips drop**: `hipsLift` gains `of?: 'height' | 'hips'`. The default `'height'` keeps the existing semantics. Death uses `'hips'`: values are a share of the hips' rest height above the model's lowest point, `[0, -0.25, -0.55, -0.8, -0.82]`. For a body of usual thickness, the pelvis then rests at about 18% of its standing height, which is roughly half the body's depth lying down. `buildRoll6Clip` measures the hips' rest world height relative to the bounds' minimum Y.

**Rationale**:
- Relative to the hips, the drop works for squat and tall models.
- Keyframes as data keep it unit-testable, like the other clips. The test is that it ends with the hips at −90° about X.

**Check**: the existing `roll6Clips` tests say "first key equals last (loops)". They will apply only to `loop: true` clips.

## R4 — Stored value and automatic death

**Decision**: add the column `tokens.model_down_clip varchar(260) null`.
- **Accepted values**: the same as the other two clip columns, validated by the same `Guard.ModelClip(value, "modelDownClip")`.
- **`"roll6"` in the down state**: means Roll6's death. `resolveAnimation` maps the state `down` to the Roll6 clip `death`.
- **`"roll6-guard"`**: the validator still accepts it, but the form does not offer it for `down`. If it is sent, it resolves to the guard, which is harmless.
- **Automatic**: `CLIP_PATTERNS.down = /death|dying|\bdie\b|dead|morte|morr/`, tested against the last `|` segment, lowercased. "die" needs word boundaries so that names like "Soldier_Idle" do not match. "ko"/"knockout" are left out because they are too ambiguous.
- **Without a model**: the choice is dropped, like idle/walk.

**Rationale**: it is a column of the same kind as its siblings and needs no new validation rule. Old tokens have null (automatic), so they get the death without anyone editing them (SC-005).

## R5 — States in the model layer

**Decision**: `ModelSpec` gains `lying: boolean`, and `ModelClipChoices` gains `down`. `Drawn` gains `down: AnimationAction | null` and `lying: boolean`.

`animate(entry)` builds the three actions. The death action uses `setLoop(LoopOnce, 1)` and `clampWhenFinished = true`. Then:

| Situation | Behavior |
|---|---|
| Spec lying, model just loaded | Play death, set `action.time = clip.duration`, `mixer.update(0)`: the last frame, no playback (FR-011). |
| Standing → lying, already loaded | Stop idle/walk, `down.reset().play()`: plays once and clamps (FR-012). |
| Lying → lying (Caído ↔ Fora de combate) | Nothing (`entry.lying` unchanged). |
| Lying → standing | Stop death, idle `reset().play()`. |
| `setWalking` while lying | Ignored. The walker is never active for a down piece (`canWalk` already refuses lying). |
| Clip choices change while lying | `animate` again, at the last frame (no replay). |

The render loop already updates every mixer each frame. A clamped action costs one evaluation, as idle does today.

**Rationale**: the "once when seen live" rule is local per viewer (spec assumption). The layer only compares the previous and next `lying` of the same piece, so a reload or a newly opened view always shows the end pose.

## R6 — Fallback: tipped model

**Decision**: when the death resolves to `static` (no clip, non-Mixamo skeleton or "Sem animação"), the lying model is turned −90° about its own X axis (on its back) and placed by `fitLyingModel`.

`modelLayer.place` uses `fitLyingModel` when `entry.lying && !entry.down`, and `fitModel` otherwise. The object's rotation becomes `(−π/2, rotationY, 0)` with Euler order `'YXZ'`: yaw first, then the tip in the model's frame.

**Rationale**: the spec's edge case is that the model never vanishes and never stands. The rotation is pure math and unit-tested.

## R7 — Scale and center of a lying model

**Decision**:
- **Scale**: stays the standing fit, `figureHeight(width) / standingHeight`, with `width` = `spriteSpec(piece).width`. That is the box of the **current** shape, which is the down space when lying.
  - For the usual sizes (up 1 / down 2; up 1 / down 3; 7 ↔ 10) the width across the facing is the same as standing. A token whose down shape is wider than its up shape (up 1 / down 7) gets a bigger lying model. This is accepted and documented, because `MapTokenInfo` carries no `upSpace`, and adding one for this edge would be a backend change with no request behind it.
- **Center**: `spriteSpec.center`, which is the middle of the current (down) shape. A 1/2 token lies across both hexes, like the 2D piece.
- **Animated death**: placement uses `fitModel` (feet middle on the center). The Roll6 death turns about the hips, which stand over the feet, so the lying body ends centered on the shape. File clips end where they end (spec edge case).

**`fitLyingModel(bounds, width, center, yaw)`**:
- Scale as standing.
- Rotated bounds: y′ ∈ [min z, max z], z′ ∈ [−max y, −min y].
- Position:
  - y: −(min z) · scale.
  - x/z: the turned middle of the rotated bounds put on `center` (same turn formula as `fitModel`).

## R8 — What stays out

- `isShownIn3d` (figures, proxies, balloons, bubbles) is unchanged. A down piece has no proxy, so it casts no figure shadow and has no balloon, as today.
- `canWalk` already refuses a lying piece.
- The camera's `followed` piece is unchanged; it can follow a down character.
- The 2D map, `TokenLayer` and the snapshot are untouched.
- Out of combat is not grayscale in 3D (spec assumption).

## R9 — Preview and form

**`ModelPreview`**:
- The `walking: boolean` prop becomes `shown: AnimationState`.
- It builds three actions (death `LoopOnce` + clamp). Showing `down` plays the death from the start.
- Without a death clip, it tips the object −90° about X around its bounding-box center for the turntable.
- `playback()` reports `paused: true` once the death has finished (the timeline shows it at the end), and `play()` from the end restarts at 0.
- `capture` already measures `Box3.setFromObject(model, true)`, so it handles a lying pose or the tipped fallback.

**`ModelField`**:
- The "Caminhar / Parar" toggle is replaced by a small `btn-group` "Parado | Caminhando | Caído" (`aria-pressed`). Buttons whose state is `static` stay enabled for Parado and Caído (Caído without animation shows the tipped model) and disabled for Caminhando, as today's walk toggle is hidden.
- `ANIMATION_STATES` gains `down`, labelled `tokens.model.state.down` = "Caído". Changing a select switches the preview to that state, as 056 does for walk.
- Option labels for `down`: `roll6` → "Morte (Roll6)" (`tokens.model.option.death`); guard not offered.
- `onClips(sources, reduced, deforms)`.

**`useModelFile` / `tokenForm`**: `clips.down` (seeded from `token.modelDownClip`, reset on a new file or removal), `ResolvedModel.modelDownClip`, sent by `toTokenInsert`, dropped without a model.

## R10 — Tests

- **Pure, Vitest**: everything in `lib/` listed in the plan, plus `threeClips` with the synthetic rigs its tests already build (protected vs unprotected limits, `deforms`, death drop relative to the hips, LoopOnce clip duration).
- **Backend**: `TokenTests` and the existing MCP reflection tests (the new parameter needs its `[Description]`).
- **Not unit-tested**: the WebGL state machine in `modelLayer` and the preview. It is covered by the quickstart's manual pass, which stays pending: there is no local database.
