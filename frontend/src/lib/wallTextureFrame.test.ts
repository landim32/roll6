import { describe, expect, it } from 'vitest';
import { drawRaycastFrame, skyGradient } from './raycastFrame';
import type { FrameScene, PixelBuffer } from './raycastFrame';
import { buildMaskGrid } from './raycaster';
import type { CameraPose } from './raycaster';

/** The wall texture of 036 as the frame paints it: the picture over every wall face, row by row. */

const WIDTH = 64;
const HEIGHT = 36;
const AREA = { x: 0, y: 0, width: 500, height: 500 };
// The camera at (250, 450) looking north at a 5 × 5 mask of 100 px cells: the wall row 1 is 250 away from the camera and
// its face is on the frame from row 7 (z = 120, the top of a whole wall) to row 28 (the floor); the horizon is row 18.
const CAMERA: CameraPose = { x: 250, z: 450, yaw: 0, attached: false };

const TONES: Record<string, number> = { '#': 0, '.': 255, '~': 200 };
const maskOf = (rows: string[]) => {
  const width = rows[0].length;
  const pixels = new Uint8ClampedArray(width * rows.length * 4);
  rows.forEach((line, y) => [...line].forEach((ch, x) => pixels.set([TONES[ch] ?? 255, TONES[ch] ?? 255, TONES[ch] ?? 255, 255], (y * width + x) * 4)));
  return buildMaskGrid(pixels, width, rows.length, AREA);
};
const WALL = maskOf(['.....', '#####', '.....', '.....', '.....']);

const render = (scene: Partial<FrameScene>) => {
  const frame: PixelBuffer = { data: new Uint8ClampedArray(WIDTH * HEIGHT * 4), width: WIDTH, height: HEIGHT };
  drawRaycastFrame(frame, { mask: null, map: null, background: null, sprites: [], ...scene }, CAMERA, 70, skyGradient(HEIGHT / 2));
  const at = (x: number, y: number) => [...frame.data.slice((y * WIDTH + x) * 4, (y * WIDTH + x) * 4 + 4)];
  return { at, frame };
};

const solid = (r: number, g: number, b: number, a = 255): PixelBuffer => ({ data: new Uint8ClampedArray([r, g, b, a, r, g, b, a, r, g, b, a, r, g, b, a]), width: 2, height: 2 });

/** A picture `columns × rows`, painted by a function of the cell. */
const picture = (columns: number, rows: number, paint: (column: number, row: number) => number[]): PixelBuffer => {
  const data = new Uint8ClampedArray(columns * rows * 4);
  for (let row = 0; row < rows; row++) for (let column = 0; column < columns; column++) data.set(paint(column, row), (row * columns + column) * 4);
  return { data, width: columns, height: rows };
};

const isRed = (pixel: number[]) => pixel[0] > 60 && pixel[1] < 30 && pixel[2] < 30;
const isGreen = (pixel: number[]) => pixel[1] > 60 && pixel[0] < 30 && pixel[2] < 30;
const isBlue = (pixel: number[]) => pixel[2] > 60 && pixel[0] < 30 && pixel[1] < 30;

describe('the wall texture in the frame (036)', () => {
  it('paints the wall with the picture instead of the map colors', () => {
    const { at } = render({ mask: WALL, wallTexture: solid(255, 0, 0) });

    expect(isRed(at(32, 18))).toBe(true);
    expect(isRed(at(10, 22))).toBe(true);
  });

  it('leaves the walls as they were without a texture (null or absent)', () => {
    const bare = render({ mask: WALL });

    expect(render({ mask: WALL, wallTexture: null }).frame.data).toEqual(bare.frame.data);
    expect(render({ mask: WALL, wallTexture: undefined }).frame.data).toEqual(bare.frame.data);
  });

  it('puts the top of the picture at the top of the wall and the bottom at the floor', () => {
    const halves = picture(2, 2, (_, row) => (row === 0 ? [0, 255, 0, 255] : [0, 0, 255, 255]));
    const { at } = render({ mask: WALL, wallTexture: halves });

    expect(isGreen(at(32, 9))).toBe(true);          // near the top of the wall: above the middle of the picture
    expect(isBlue(at(32, 26))).toBe(true);          // near the floor
  });

  it('shows only the lower part of the picture on a low wall', () => {
    // A mureta a fifth as tall as the wall: all its face is in the lower half of the picture.
    const halves = picture(2, 2, (_, row) => (row === 0 ? [0, 255, 0, 255] : [0, 0, 255, 255]));
    const { at } = render({ mask: maskOf(['.....', '~~~~~', '.....', '.....', '.....']), wallTexture: halves });

    expect(isBlue(at(32, 26))).toBe(true);
    for (let y = 0; y < HEIGHT; y++) expect(isGreen(at(32, y))).toBe(false);
  });

  it('repeats along the wall: the columns of the picture follow one another and start over', () => {
    // 2 × 2 picture, a copy is 120 units wide: red for the first 60 along the wall, green for the next 60, and again.
    const stripes = picture(2, 2, (column) => (column === 0 ? [255, 0, 0, 255] : [0, 255, 0, 255]));
    const { at } = render({ mask: WALL, wallTexture: stripes });
    const kinds = Array.from({ length: WIDTH }, (_, x) => {
      const pixel = at(x, 18);
      return isRed(pixel) ? 'r' : isGreen(pixel) ? 'g' : '-';
    });

    expect(kinds).toContain('r');
    expect(kinds).toContain('g');
    const changes = kinds.filter((kind, index) => index > 0 && kind !== kinds[index - 1]).length;
    expect(changes).toBeGreaterThanOrEqual(2);      // more than one stripe of each: it starts over
  });

  it('keeps the shade of distance: a farther wall is darker with the same texture', () => {
    const near = render({ mask: maskOf(['.....', '.....', '.....', '#####', '.....']), wallTexture: solid(200, 200, 200) });
    const far = render({ mask: maskOf(['#####', '.....', '.....', '.....', '.....']), wallTexture: solid(200, 200, 200) });

    expect(near.at(32, 18)[0]).toBeGreaterThan(far.at(32, 18)[0]);
  });

  it('falls back to the wall color on a transparent pixel of the picture', () => {
    const bare = render({ mask: WALL });
    const hole = render({ mask: WALL, wallTexture: solid(255, 0, 0, 0) });

    expect(hole.frame.data).toEqual(bare.frame.data);
  });

  it('does not touch the sky, the floor or the top of a low wall (those keep the map)', () => {
    const low = maskOf(['.....', '.....', '~~~~~', '.....', '.....']);
    const bare = render({ mask: low });
    const textured = render({ mask: low, wallTexture: solid(255, 0, 0) });

    for (let y = 0; y < 28; y++) expect(textured.at(32, y)).toEqual(bare.at(32, y));   // above the face of the mureta
  });
});
