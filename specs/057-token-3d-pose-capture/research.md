# Research: Token 3D improvements — occlusion, guard stance, timeline and pose photo (057)

All unknowns of the Technical Context are resolved here. Each item: **Decision**, **Rationale**, **Alternatives considered**.

## R1 — Why a 2,5D figure in front of a model is hidden today

**Finding**: the 3D view is two canvases. The raycaster (`raycastRenderer` → `drawRaycastFrame`, plus the screen-size figure layer `lib/figureLayer` on Ultra) paints walls, floor, sky and the 2,5D figures. The models are drawn by `components/story/modelLayer` on a transparent WebGL canvas **stacked above** it (`.stm-story-models`). The WebGL depth buffer only knows the walls (`occluderBoxes`, depth-only boxes), so every model pixel that is not behind a wall is composited over whatever the raycaster painted — including a figure that is nearer the camera.

**Decision**: give the WebGL layer the **depth of the figures, per pixel**, and write it into its depth buffer before the models are drawn. A model fragment farther than the figure at that pixel fails the depth test, the WebGL canvas stays transparent there and the figure painted underneath shows.

**Rationale**: the raycaster already decides, pixel by pixel, which figure texel is painted (nearest-texel alpha ≥ 128 on Padrão, bilinear coverage on Alta/Ultra), with its mirrored side and its row-by-row wall occlusion. Exporting *that* decision is exact by construction — no second projection of the figures that could drift by a pixel — and transparent parts of a figure (FR-002) cost nothing. The raycaster's perpendicular depth is the camera-space `z` of the WebGL camera exactly (`lib/modelCamera`: same position, same yaw, no tilt, same projection — pinned by tests against `projectSprite`), so the conversion is a closed formula.

**Alternatives considered**:
- *Billboard quads per figure in the WebGL scene, alpha-tested with the figure's image*: a second implementation of the sprite projection, the side choice, the mirroring and the wall clipping; any mismatch shows as a halo or a gap. Rejected.
- *Move the figures into the WebGL scene entirely*: rewrites the 2,5D renderer that 034–053 pinned byte for byte. Rejected (scope, risk).
- *Draw the model layer under the raycaster with holes*: the raycaster's walls would then have to be transparent where a model is in front — the same problem the other way round.

## R2 — Producing the figure depth map

**Decision**: an optional `figureDepth` sink in the frame options.

- `FrameOptions.figureDepth?: Float32Array` (length `frameWidth × frameHeight`, filled with `0` = "no figure" by the frame before the figure pass). In the two in-frame figure loops of `drawRaycastFrame` (Padrão nearest, Alta smooth), every pixel the figure **covers** writes `min(existing, depth)`; "covers" = the texel the loop paints (Padrão: alpha ≥ 128, as today) or bilinear coverage ≥ 0.5 (Alta).
- Ultra (`figures: 'layer'`): `drawFigureLayer(target, layer, frameW, frameH, depth?)` writes the same thing at **screen** resolution, coverage ≥ 0.5.
- Hidden proxies (pieces drawn as models) paint nothing, so they write nothing.
- The renderer allocates the buffer only while a sink is registered (`raycastRenderer.setFigureDepthSink(fn | null)`), reuses it frame to frame, and calls the sink right after the frame is drawn with `{ data, width, height }` — the frame's size on Padrão/Alta, the screen's on Ultra. Those are exactly the model layer's buffer sizes (053/055: frame size on Padrão/Alta, screen on Ultra).

**Rationale**: zero change to the painted pixels (the pinned reference frame of 036/053 stays byte-identical, it does not pass the option); no allocation for maps without models; the depth sits at the resolution the figures were painted at, so edges match on every level.

**Alternatives considered**: always computing the map (costs a 960×540 float buffer per frame for nothing on maps without models); a `Uint16` map (needs a range and quantization — floats are simpler and the texture is small).

## R3 — Writing the depth map in three.js

**Decision**: a full-screen quad drawn **first** in the model layer (`renderOrder = -1`, `frustumCulled = false`, `depthTest: false`, `depthWrite: true`, `colorWrite: false`) with a `ShaderMaterial` that samples a `DataTexture` (`RedFormat`, `FloatType`, `NearestFilter`, no mipmaps) and sets `gl_FragDepth`; texels with `0` `discard`. Rows are flipped in the shader (`1.0 - vUv.y`) because row 0 of the frame is the top.

Linear → depth-buffer value for the layer's `PerspectiveCamera` (`near` = `NEAR`, `far` = 100000):

```
ndc  = (far + near) / (far - near) - (2 * far * near) / ((far - near) * d)
gl_FragDepth = ndc * 0.5 + 0.5
```

with `d` the perpendicular depth from the map, nudged by a tiny bias (`d * (1 - 1e-4)`) so a model standing exactly at a figure's depth does not z-fight with it.

The texture is re-uploaded (`needsUpdate`) only when a new map arrives; it is re-created when the size changes. `three` 0.186 compiles `ShaderMaterial` as GLSL ES 3.0 on WebGL2 (`gl_FragDepth` available; checked in `WebGLProgram.js`).

**Rationale**: one draw call, the GPU does the per-pixel comparison, nothing in the model shaders changes, walls keep working as before.

**Alternatives considered**: a custom `onBeforeCompile` on every model material comparing against the texture — touches every loaded material (skinned, morphs) and every future one. Rejected.

## R4 — Keeping models and figures in the same frame

**Finding**: the raycaster redraws only when dirty (camera, pieces, quality), while the model layer renders on its own `requestAnimationFrame` (animations). Two independent loops could pair a new figure map with the previous camera, which would show as a one-frame flicker when the order of depth changes (US1 scenario 4).

**Decision**: `modelLayer.setFigureDepth(map)` stores the map **and renders at once** with the pose it already has. `StoryView` sets the camera on both layers in the same call before the raycaster draws (as today), so the render triggered by the new map uses the same pose as the frame that produced it. The animation loop keeps rendering with the latest map in between; figures do not move between raycaster frames, so the map stays valid.

**Rationale**: removes the race without coupling the two loops.

## R5 — Timeline of the preview

**Decision**: `ModelPreview` becomes controllable through a ref (`forwardRef` + `useImperativeHandle`): `play()`, `pause()`, `seek(seconds)`, `state()` → `{ time, duration, paused, hasAnimation }`, `capture(kind, size)` (R7). The playing action is the current state's (idle or walk), `AnimationAction.time` is the position, pause is `action.paused = true` and seeking sets `action.time` and calls `mixer.update(0)` so the pose shows on the same frame (SC-006).

`components/tokens/ModelTimeline` draws a Bootstrap `form-range` (`<input type="range">`, step = duration / 200, `aria-valuetext` "1,2 s de 3,0 s") plus a play/pause button. While playing, a `requestAnimationFrame` loop writes the range's value straight to the DOM (like the 3D balloons, no React render per frame). `pointerdown`/`input` pause and seek; on release it stays paused (FR-006). Arrow keys come from the native range input (FR-007). A new action (state switch, new choice, new file) restarts it at 0, playing (FR-008). No clip → disabled (FR-009).

**Rationale**: the native range gives touch, mouse, keyboard and screen-reader support for free; the imperative handle keeps the three.js objects inside the preview.

**Alternatives considered**: a custom slider (re-implementing keyboard and ARIA); keeping `time` in React state at 60 Hz (re-renders the whole form every frame).

## R6 — Guard stance animation

**Decision**: a third Roll6 clip, `ROLL6_GUARD` (`lib/roll6Clips`, `name: 'guard'`, ~2 s loop), in the same data format and converted per skeleton by the same `buildRoll6Clip`/`fitToRig`. Pose, using the module's sign conventions (a turn about +X moves a hanging limb backwards; about +Z lifts the left side; on the spine +X leans the top forward):

- legs apart and bent: `LeftUpLeg` (−20, 0, +10), `RightUpLeg` (−20, 0, −10), `LeftLeg`/`RightLeg` +35 about X, feet −15 to stay flat;
- hips lowered (`hipsLift` ≈ −0.04 of the height) and swaying a little side to side;
- trunk leaning forward (`Spine` +8, `Spine1` +4 about X), head back up (`Neck` −8);
- guard: upper arms forward and up (`LeftArm`/`RightArm` −55 about X, slightly in), forearms bent hard (−100 about X), hands in front of the chest;
- a slow breath on `Spine1`/`Spine2` and a small weight shift (`Hips` ±2 about Z) over the loop.

Stored choice value: **`"roll6-guard"`** (beside `"roll6"`, `"none"`, `"clip:{name}"`). `resolveAnimation` returns `{ source: 'roll6', clip: 'guard' }`; the clip builder caches Roll6 clips per clip name instead of per state. Offered in both selects only for a Mixamo skeleton (FR-016), reduced by `fitToRig` like the others (FR-018).

**Backend**: `Guard.ModelClip` accepts `"roll6-guard"` (constant `MODEL_CLIP_ROLL6_GUARD`); no column change. MCP: `McpDocs.MODEL_CLIP` and the guide list the value (FR-019).

**Rationale**: the existing pipeline already handles arbitrary rigs, T/A poses and tearing; a new clip is data plus one enum value.

**Alternatives considered**: a third animation *state* ("Em guarda") — needs a rule for when the table plays it, which the spec does not ask for (Assumption: it is an option of the existing selects).

## R7 — Photo of the paused pose (Q1 = A: from above)

**Decision**: `components/tokens/poseShot.ts` (three.js, lazy with the preview) with the pure framing in `lib/poseShot.ts`.

- **Camera**: `OrthographicCamera` straight above the model, looking down (−Y), `up = (0, 0, −1)`, so the model's front (+Z) is at the **bottom** of the image — the direction every token image faces (look 3, `TokenLayer` turns pieces by `(look − 3) × 60°`).
- **Pose**: the model as the preview shows it, but with the turntable's rotation set to 0 for the shot (Edge case: the manual rotation never changes the photo), restored afterwards.
- **Framing** (`lib/poseShot.frameFor`): the model's posed bounds (`Box3.setFromObject(model, true)` — in 0.186 the precise path calls `getVertexPosition`, which applies the bones) projected on X/Z, centered, scaled uniformly so the longer side fits the frame minus a 4% margin; frame = `tokenImageSize(space)` (1 hex 240×240, 2 hex 240×480, …) — the up space for "Em Pé", the down space (2 when empty) for "Caído". Same view for both (Q1 = A); only the frame and the field differ.
- **Render**: a separate `WebGLRenderer` on an offscreen canvas of exactly the frame size (`alpha: true`, `preserveDrawingBuffer: true`, clear alpha 0), sharing the preview's scene objects for one render, with a top light added for the shot; then `canvas.toBlob('image/png')` → object URL. Disposed right after. The preview's renderer is never resized (no flicker).

**Into the field** (FR-013): `ImageCropper` gets an optional `source?: { url: string; key: number }` prop. A new `key` opens the cropper on that URL exactly as if a file had been chosen (same zoom/rotation controls, `onChange` emits the crop). Because the photo has the field's exact aspect, the initial crop covers it whole. `TokenFormFields` holds `generated = { up?, down? }` and passes them; saving uploads through the existing `uploadTokenImage` path, so nothing is stored before the token is saved (FR-013, US3 scenario 4). Object URLs are revoked when replaced or when the form closes.

**Rationale**: reuses the crop/upload/save path of hand-picked images — no new endpoint, no new storage rule; a separate renderer keeps the preview stable and makes the transparent PNG trivial (no color-space conversion through render targets).

**Alternatives considered**:
- *Render target + `readRenderTargetPixels`*: needs sRGB handling and a Y flip by hand. Rejected.
- *Resizing the preview's renderer for the shot*: visible flicker, and the preview's camera is perspective. Rejected.
- *Uploading the photo immediately*: would store an image the user may discard (spec: nothing is saved before the token).

## R8 — Who can generate

**Decision**: the timeline is shown to anyone who sees the preview; "Gerar imagem" is shown only where the image fields are editable (`TokenModal` "Incluir token" and `TokenEditModal`, which only the creator opens) and only once the preview opened (`state().hasAnimation` or the static pose). It is enabled only while paused or when the state has no animation (FR-010, US2 scenario 6).

## R9 — Tests

- Vitest pure: `lib/poseShot` (frame per space, margin, centering, longest side fits, front at the bottom for a model facing +Z), `lib/modelAnimations` (`roll6-guard` parsing, resolve, options only for Mixamo), `lib/roll6Clips` (guard loops close, bones are Mixamo, amplitudes in range), `lib/raycastFrame` (`figureDepth`: a figure writes its depth on covered pixels only, the nearer of two wins, transparent texels and hidden proxies write nothing, a nearer wall row writes nothing; **reference frame unchanged**), `lib/figureLayer` (same at screen size), `lib/modelDepth` (the NDC conversion against `PerspectiveCamera.projectionMatrix` applied to a point at depth `d`).
- Vitest + three (node): `threeClips` builder caches by clip name and builds `roll6-guard`.
- xUnit: `GuardTests` accepts `roll6-guard`, still refuses `Roll6-Guard`/`guard`.
- Manual (quickstart): figure in front of a model at the three quality levels and while walking; timeline; both photos into the fields and onto the 2D map.
