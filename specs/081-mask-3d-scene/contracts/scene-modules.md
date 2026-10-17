# Contract: 3D view modules (081)

There is no network contract: the API, the hub and the MCP are unchanged. These are the module boundaries the tasks
build against.

## `lib/maskGrid.ts` (moved)

```ts
export const WALL_HEIGHT: number;      // 3 × HEX_SIZE = 120
export const EYE_HEIGHT: number;       // unchanged formula (frontImage FACE_HEIGHT_SHARE)
export const MAX_MASK_CELLS = 512;
export interface MapArea { x: number; y: number; width: number; height: number }
export interface MaskGrid { cols; rows; originX; originY; cellWidth; cellHeight; heights: Uint8Array }
export const buildMaskGrid: (pixels, width, height, area, maxCells?) => MaskGrid;   // unchanged behaviour
export const heightAt: (grid, x, y) => number;                                      // unchanged
```

## `lib/terrain.ts` (new, pure)

```ts
export const TERRAIN_LEVELS = 16;
export const STEP_HEIGHT: number;      // 0.3 × WALL_HEIGHT
export interface Terrain { grid: MaskGrid; levels: Uint8Array }
export const buildTerrain: (grid: MaskGrid | null) => Terrain | null;
export const levelHeight: (level: number) => number;
export const terrainHeightAt: (terrain: Terrain | null, x: number, z: number) => number;
export const groundUnder: (terrain: Terrain | null, x: number, z: number, radius: number) => number;
export interface TerrainGeometry { positions: Float32Array; normals: Float32Array; uvs: Float32Array; colors: Float32Array;
  indices: Uint32Array; groups: { top: [number, number]; side: [number, number] } }
export const buildTerrainGeometry: (terrain: Terrain, options: {
  mapArea: MapArea;                    // image area: the UV 0..1 range for tops
  wallTexture: { width: number; height: number } | null;
  mapColor: (x: number, z: number) => [number, number, number];   // side color without a texture
}) => TerrainGeometry;
export const floorPlane: (mapArea: MapArea, margin: number) => { corners: [number, number][]; uv: [number, number][] };
```

Invariants (tested):
- Old black and white masks give only levels 0 and 15.
- No top quad overlaps another.
- The tops of a level cover exactly the cells of that level.
- Every height change between neighbours has side area equal to the cell edge × the height difference.

## `lib/terrainSight.ts` (new, pure)

```ts
export interface Point3 { x: number; y: number; z: number }
export const firstHit: (terrain: Terrain | null, from: Point3, to: Point3, clearance?: number) => number | null; // fraction 0..1
export const canSee: (terrain: Terrain | null, from: Point3, to: Point3) => boolean;
```

## `lib/storyCamera.ts` (extended)

```ts
export interface CameraPose { x: number; y: number; z: number; yaw: number; pitch: number; attached: boolean }
export const PITCH_MIN: number; export const PITCH_MAX: number; export const PITCH_DEFAULT: number;
export const clampPitch: (pitch: number) => number;
export const orbitPose: (target: Point, ground: number, characterYaw: number, orbit: number, pitch: number,
  distance: number, terrain: Terrain | null, edge: CameraBlocked) => CameraPose;
export const stepCamera: (pose, input: CameraInput & { pitch?: number }, terrain, edge) => CameraPose; // free camera on the ground
// FOV_MIN/FOV_MAX/FOV_STEP/FOV_DEFAULT/clampFov/lookToYaw/forwardOf: unchanged
```

## `lib/walker.ts` (extended)

```ts
export interface WalkerState { x; z; y: number; vy: number; yaw; moving; distance }
export const stepWalker: (state: WalkerState, input: WalkerInput, dt: number, terrain: Terrain | null, edge: CameraBlocked) => WalkerState;
export const walkCamera: (state: WalkerState, terrain: Terrain | null, edge: CameraBlocked, orbit?: number, pitch?: number) => CameraPose;
```

## `lib/billboard.ts` (new, pure)

```ts
export const figureView: (look: number, center: Point, camera: Point, available: ViewImages<unknown>)
  => { view: SpriteView | 'fallback'; mirrored: boolean };
export const facingAngle: (center: Point, camera: Point) => number;   // rotation about Y to face the camera
```

## `components/story/sceneRenderer.ts` (new, lazy, three)

```ts
export interface SceneFrame { width: number; height: number; figures: { id: number; screenX: number; top: number;
  bottom: number; depth: number; headVisible: boolean }[] }
export interface SceneRenderer {
  setQuality(profile: QualityProfile): void;
  setTerrain(terrain: Terrain | null, images: { map: ImageSource | null; wall: ImageSource | null; sky: ImageSource | null;
    mapArea: MapArea }): void;
  setFigures(figures: SceneFigure[]): void;       // billboards (id, views, fallback, center, yaw/look, width, ground)
  setModels(models: ModelSpec[]): void;          // ModelSpec gains `ground`
  setPose(id: number, center: Point, yaw: number, ground: number): void;
  setWalking(id: number, walking: boolean): void;
  setCamera(pose: CameraPose, fov: number): void;
  resize(width: number, height: number): void;
  refresh(): void;
  dispose(): void;
}
export const createSceneRenderer: (canvas: HTMLCanvasElement, onFrame: (frame: SceneFrame) => void) => SceneRenderer;
```

`CanvasUnavailableError` (WebGL missing) keeps the existing fallback: the toast `story.noWebgl`, then back to 2D.
