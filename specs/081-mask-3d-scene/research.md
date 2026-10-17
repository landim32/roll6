# Research: Mapa 3D de verdade montado pela máscara (081)

## R1 — Renderer

**Decision**: one three.js scene (`components/story/sceneRenderer.ts`, lazy) replaces `raycastRenderer` (Canvas 2D) and
`modelLayer` (the WebGL overlay).

**Rationale**:
- `three` 0.186.1 is already in the stack and already loaded for models (055).
- One depth buffer solves every occlusion that 055–057 patched: hidden proxies, mask boxes in `occluders`, the figure
  depth map of `modelDepth`, `figureLayer`, and the row-by-row wall occlusion.
- Pitch and real heights come for free.

**Alternatives considered**:
- Keep the raycaster with y-shearing and floor heights (Doom-like): fake pitch, distortion, and still two layers.
- A full engine (Babylon, PlayCanvas): stack change and heavier.
- A displaced plane: walls become slopes.

## R2 — From mask to terrain

**Decision**: reuse `buildMaskGrid` unchanged. It moves to `lib/maskGrid.ts`, and so does its median-per-cell rule
(036), which keeps old black and white masks identical. Then:

- **Quantize** heights to `TERRAIN_LEVELS = 16` levels (0 = floor, 15 = full wall). Close tones merge and isolated
  speckles cannot form many tiny columns. A full wall stays exactly `WALL_HEIGHT` (120 units, `3 × HEX_SIZE`).
- **Tops**: for each level > 0, greedy rectangles over the cells of that level, one quad each, at `y = level height`.
- **Floor**: one large plane at `y = 0` under everything, extending `FLOOR_MARGIN` past the map. Its UV maps the map
  image's area to [0, 1] and goes outside it beyond. The map texture uses `ClampToEdgeWrapping`, which reproduces 036
  (the edge color continues, no seam).
- **Sides**: for each pair of neighbouring cells with different heights, a vertical face from the lower to the higher
  top, facing the lower cell. Faces on the same row/column with the same lower/upper heights and the same facing are
  merged into one quad. Cells at the grid's border face the outside (lower = 0).
- **UVs**: tops use the map position (the same mapping as the floor, so a block's top shows the map image under it).
  Sides use `u = distance along the wall / repeatWidth(wallTexture)` and `v = height / WALL_HEIGHT`, the 036 rule (a
  low wall shows the texture's lower part). Without a wall texture, sides use vertex colors sampled from the map image
  at the cell, darkened by facing (east/west vs north/south, as `shade` did).
- **Output**: plain typed arrays (`positions`, `uvs`, `normals`, `colors`, `indices`, plus group ranges top/side). They
  are pure and testable without WebGL. `sceneRenderer` wraps them in `BufferGeometry`.

**Rationale**: greedy merging keeps real maps in the low thousands of triangles even at 512 cells. Blocks keep the 036
meaning (tone = height) with vertical walls.

**Alternatives considered**:
- Marching squares or smoothing: rounder, but walls stop being vertical, and climbing rules get fuzzy.
- One box per cell: up to 262k boxes, too heavy for phones.

## R3 — Height of a point

**Decision**: `terrainHeightAt(terrain, x, z)` returns the quantized height (world units) of the cell under the point
(0 outside the grid). For an entity with a radius, `groundUnder(terrain, x, z, radius)` returns the highest of the
center and 4 points on the radius. The feet then never sink into an edge.

## R4 — Step and climbing (Q2 = A)

**Decision**: `STEP_HEIGHT = 0.3 × WALL_HEIGHT` (36 units, about the waist of a 1-hex figure, which is 64 units tall).

- A move into a point whose ground is more than `STEP_HEIGHT` above the current feet is blocked. The walker slides
  along it, as today, one axis at a time.
- Stepping up to a ground ≤ `STEP_HEIGHT` above snaps up over `STEP_RISE_TIME = 0.1 s`, smoothed for the camera.
- Stepping off a ledge falls with `GRAVITY = 1200 units/s²` until the ground.
- The map edge still blocks.

For mask makers: tones lighter than about 70% gray are climbable steps. A tall stage is made with a staircase of tones.

**Alternatives considered**: a jump (refused in Q2), and climbing anything below a full wall (refused in Q2).

## R5 — Camera

**Decision**:
- `CameraPose` gains `y` (eye height in world units) and `pitch` (radians, + = up), clamped to
  `PITCH_MIN = −70°`…`PITCH_MAX = +60°`.
- **Third person** (follow, walk, the 068 orbit): the target is the character's head (`ground + EYE_HEIGHT`). The camera
  sits at `distance` behind it on a sphere given by yaw + orbit and pitch, and looks at the target.
- **Pull-in**: `terrainSight.firstHit(from, to)` steps along the 3D segment. The first sample whose terrain height
  exceeds the segment's y (or y < ground + `CAMERA_CLEARANCE`) brings the camera to one step before it, as 036 did in
  2D.
- **Free camera** (GM / no piece): it walks like the walker (ground + `EYE_HEIGHT`, the same step and block rules) and
  has pitch.
- **Input**: the vertical drag (mouse or one finger) changes pitch with the same `DRAG_TURN` factor as the horizontal
  orbit, and the keys R/F also change it. "Voltar ao personagem" resets the pitch to `PITCH_DEFAULT = −10°`.
- The field-of-view zoom (30–90°) and the walk distance zoom stay as they are.

## R6 — Pieces

- **Figures**: one quad per piece, `width` = the piece's width and height from the image aspect (same size rules as
  today).
  - The quad turns to face the camera about the vertical axis (cylindrical billboard), standing on the ground at its
    center.
  - The texture is the side chosen each frame by `viewSeen`/`chooseSprite`, mirrored with `repeat.x = −1` when needed.
  - `alphaTest = 0.5`; nearest or mipmapped by the quality level.
  - The pixel buffers still go through `fitSprites` (036).
- **Models**: `modelSet` keeps `modelLayer`'s loading, clip building, death/lying states and walking, and gains a ground
  height per spec. It drops `setMask`, `setFigureDepth` and its own camera.
- **Lying pieces** (058) lie on the ground.
- **Walk pose** (070): `walkPose` puts center and yaw at the stored point; the height is the ground there.
- **Blob shadow**: a soft dark disc under each standing piece, as the raycaster drew, on every level. Ultra adds the
  directional shadow map for the terrain and pieces.

## R7 — Balloons

`BubbleLayer`/`storyBubbles` take, per frame, `{ id, screenX, top, bottom, depth, headVisible }`. The new renderer
computes them for each piece that has a balloon:
- project the head point (ground + figure height) and the feet;
- `depth` = distance along the view;
- `headVisible` = in front of the camera, inside the screen, and `terrainSight.firstHit(camera, head) === null`.

Pieces may hide each other's head; the test ignores that, as today.

## R8 — Quality levels (Q3 = A)

| Level | pixel ratio | MSAA | figure sampling | anisotropy | shadow map |
|---|---|---|---|---|---|
| Padrão | 1 | no | nearest | 1 | no |
| Alta | min(dpr, 1.5) | yes | linear + mipmaps | 4 | no |
| Ultra | min(dpr, 2) | yes | linear + mipmaps | 8 | 2048, directional |

The storage key, the chooser and the texts keep their meaning ("lighter → sharper"). Changing the antialias needs a new
`WebGLRenderer`, so a level change rebuilds the renderer and keeps the scene data.

## R9 — Lighting and fog

- A `HemisphereLight` and a `DirectionalLight` from above-front.
- Materials are `MeshLambertMaterial` for the terrain and `MeshBasicMaterial` for figures, so the art looks exactly like
  its image.
- `Fog` (start 12 hex, color = the sky's average or neutral) replaces `SHADE_FALLOFF`.

The map stays recognizable (spec assumption).

## R10 — Render loop

Render only when needed:
- the camera changed;
- a piece or balloon changed;
- a model is animating;
- a remote walker is interpolating (069);
- a texture arrived.

`StoryView` keeps the same inputs (pieces, mask, images, quality, camera hook, walk sync), so the rest of the app does
not change.

## R11 — What is removed

- `lib/raycaster.ts` keeps nothing. Its still-used exports move to `lib/maskGrid.ts`: `buildMaskGrid`, `heightAt`,
  `MaskGrid`, `MapArea`, `WALL_HEIGHT`, `EYE_HEIGHT`, `MAX_MASK_CELLS`.
- Removed outright:
  - `lib/raycastFrame.ts`, `lib/figureLayer.ts`, `lib/mipmap.ts`, `lib/occluders.ts`, `lib/modelDepth.ts`,
    `lib/modelCamera.ts`;
  - `components/story/raycastRenderer.ts`, `components/story/modelLayer.ts`;
  - their tests.
- `lib/wallTexture.ts` keeps `repeatWidth` (and `textureColumn` only if used by `terrain`).
- The documentation (`CLAUDE.md` 3D sections, the MCP guide's "3D view" text) is updated so it no longer describes the
  raycaster. The MCP text only describes what the user sees, so only wording changes.
