# Data Model: Mapa 3D de verdade montado pela máscara (081)

There are no server, database or API changes. Everything below is client-side state, built when the 3D view opens.

## MaskGrid (existing, moved to `lib/maskGrid.ts`)

| Field | Meaning |
|---|---|
| `cols`, `rows` | Cells, ≤ 512 on the longest side |
| `originX`, `originY`, `cellWidth`, `cellHeight` | Map-pixel placement of the grid over the map image's area |
| `heights` | `Uint8Array`, 0 (floor) … 255 (full wall), the median luminance rule of 036 |

## Terrain (new, `lib/terrain.ts`)

| Field | Meaning |
|---|---|
| `grid` | The `MaskGrid` it came from |
| `levels` | `Uint8Array` per cell, 0…`TERRAIN_LEVELS − 1` (16 levels) |
| `heightOf(level)` | `level / (TERRAIN_LEVELS − 1) × WALL_HEIGHT` |

Derived:

- `terrainHeightAt(x, z)` gives the world height of the cell under a map point, or 0 outside.
- `groundUnder(x, z, radius)` gives the highest ground among the center and 4 points on the radius.

## TerrainGeometry (new, pure arrays)

| Field | Meaning |
|---|---|
| `positions`, `normals`, `uvs`, `colors` | `Float32Array` per vertex |
| `indices` | `Uint32Array` |
| `groups` | `{ top: [start, count], side: [start, count] }` |
| `floor` | The floor plane (corners and UV range past the map edges) |

Rule: every top quad is a greedy rectangle of one level. Every side face separates two neighbouring cells of different
levels, or a cell and the outside.

## CameraPose (extended, `lib/storyCamera.ts`)

| Field | Meaning |
|---|---|
| `x`, `z` | Map position (unchanged) |
| `y` | Eye height in world units (new) |
| `yaw` | Unchanged |
| `pitch` | Radians, −70°…+60° (new; + = up) |
| `attached` | Unchanged |

## WalkerState (extended, `lib/walker.ts`)

| Field | Meaning |
|---|---|
| `x`, `z`, `yaw`, `moving`, `distance` | Unchanged |
| `y` | Height of the feet (new) |
| `vy` | Vertical speed while falling (new, 0 on the ground) |

Transitions:

- On the ground, moving onto ground ≤ feet + `STEP_HEIGHT`: the walker steps up, with `y` easing to the new ground.
- Moving onto ground > feet + `STEP_HEIGHT`: blocked on that axis.
- Ground below the feet: the walker falls (`vy` += gravity) until it reaches the ground (`vy` = 0).

## QualityProfile (redefined, `lib/viewQuality.ts`)

| Field | Padrão | Alta | Ultra |
|---|---|---|---|
| `maxPixelRatio` | 1 | 1.5 | 2 |
| `antialias` | false | true | true |
| `figureSampling` | nearest | smooth | smooth |
| `anisotropy` | 1 | 4 | 8 |
| `shadowMap` | 0 | 0 | 2048 |

The storage key is still `roll6:3d-quality`, with the same values (`standard`, `high`, `ultra`).

## Piece placement (derived per frame)

| Field | Meaning |
|---|---|
| `center`, `yaw` | From `spriteSpec`/`walkPose`, unchanged |
| `ground` | `groundUnder(center, width / 2)` |
| `view`, `mirrored` | From `billboard.figureView(look, center, camera)` |
| Balloon frame result | `{ id, screenX, top, bottom, depth, headVisible }` for `BubbleLayer` |
