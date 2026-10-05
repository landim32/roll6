import { describe, expect, it } from 'vitest';
import { drawRaycastFrame, skyGradient } from './raycastFrame';
import type { FrameScene, PixelBuffer, RenderSprite } from './raycastFrame';
import { buildMaskGrid } from './raycaster';
import type { CameraPose } from './raycaster';
import type { ViewImages } from './spriteView';

const WIDTH = 64;
const HEIGHT = 36;
const AREA = { x: 0, y: 0, width: 500, height: 500 };

/** A 5 × 5 mask of 100 px cells with one wall row at y 100–200 (row 1). */
const wallRowMask = () => {
  const pixels = new Uint8ClampedArray(5 * 5 * 4).fill(255);
  for (let x = 0; x < 5; x++) pixels.set([0, 0, 0, 255], (1 * 5 + x) * 4);
  return buildMaskGrid(pixels, 5, 5, AREA);
};

const solid = (r: number, g: number, b: number, a = 255, size = 4): PixelBuffer => ({
  data: new Uint8ClampedArray(Array.from({ length: size * size }, () => [r, g, b, a]).flat()),
  width: size,
  height: size,
});

const camera: CameraPose = { x: 250, z: 450, yaw: 0, attached: false };

const render = (scene: Partial<FrameScene>, pose: CameraPose = camera) => {
  const frame: PixelBuffer = { data: new Uint8ClampedArray(WIDTH * HEIGHT * 4), width: WIDTH, height: HEIGHT };
  const zBuffer = new Float32Array(WIDTH);
  drawRaycastFrame(frame, zBuffer, { mask: null, map: null, background: null, sprites: [], ...scene }, pose, 70, skyGradient(HEIGHT / 2));
  const at = (x: number, y: number) => [...frame.data.slice((y * WIDTH + x) * 4, (y * WIDTH + x) * 4 + 4)];
  return { at, zBuffer, frame };
};

describe('drawRaycastFrame', () => {
  it('draws sky above, wall in the middle and floor below, in every column, all opaque', () => {
    const { at, frame } = render({ mask: wallRowMask() });

    const sky = at(32, 0);
    const wall = at(32, 18);
    const floor = at(32, 35);
    expect(sky[0]).toBeLessThan(40); // the dark top of the gradient
    expect(wall.slice(0, 3)).not.toEqual(sky.slice(0, 3));
    expect(floor.slice(0, 3)).not.toEqual(wall.slice(0, 3));
    for (let i = 3; i < frame.data.length; i += 4) expect(frame.data[i]).toBe(255);
  });

  it('puts the walls distance in the z-buffer (perpendicular, so a straight wall is flat) and Infinity without walls', () => {
    const { zBuffer } = render({ mask: wallRowMask() });
    expect(zBuffer[32]).toBeCloseTo(250, 0);
    expect(zBuffer[0]).toBeCloseTo(250, 0);
    expect(zBuffer[63]).toBeCloseTo(250, 0);

    expect(render({}).zBuffer.every((value) => value === Infinity)).toBe(true);
  });

  it('draws a closer wall taller than a farther one', () => {
    const wallRows = (pose: CameraPose) => {
      const { at } = render({ mask: wallRowMask() }, pose);
      const sky = at(32, 0).slice(0, 3);
      let rows = 0;
      for (let y = 0; y < HEIGHT; y++) {
        const p = at(32, y).slice(0, 3);
        const isSky = y < HEIGHT / 2 && p.every((v, i) => Math.abs(v - skyGradient(HEIGHT / 2)[y][i]) < 1.5);
        if (!isSky && y < HEIGHT / 2) rows += 1;
      }
      return { rows, sky };
    };

    expect(wallRows({ ...camera, z: 300 }).rows).toBeGreaterThan(wallRows(camera).rows);
  });

  it('takes the color of the wall from the map image where the ray struck it', () => {
    const { at } = render({ mask: wallRowMask(), map: { pixels: solid(200, 40, 40), area: AREA } });

    const [r, g, b] = at(32, 18);
    expect(r).toBeGreaterThan(g * 2);
    expect(r).toBeGreaterThan(b * 2);
  });

  it('paints the floor from the map image in perspective', () => {
    const { at } = render({ map: { pixels: solid(40, 200, 40), area: AREA } });

    const [r, g] = at(32, 35);
    expect(g).toBeGreaterThan(r * 2);
  });

  it('shows the background panorama above the horizon where no wall stands, and not below it', () => {
    const { at } = render({ background: { pixels: solid(0, 200, 0), repeats: 1 } });

    expect(at(10, 0).slice(0, 3)).toEqual([0, 200, 0]);
    expect(at(10, 10).slice(0, 3)).toEqual([0, 200, 0]);
    expect(at(10, 30)[1]).toBeLessThan(100); // the floor, not the panorama
  });

  it('turns the panorama with the camera', () => {
    const stripes: PixelBuffer = { data: new Uint8ClampedArray(8 * 2 * 4), width: 8, height: 2 };
    for (let y = 0; y < 2; y++) {
      for (let x = 0; x < 8; x++) stripes.data.set(x % 2 === 0 ? [255, 0, 0, 255] : [0, 0, 255, 255], (y * 8 + x) * 4);
    }
    const a = render({ background: { pixels: stripes, repeats: 1 } }, { ...camera, yaw: 0 });
    const b = render({ background: { pixels: stripes, repeats: 1 } }, { ...camera, yaw: 0.4 });

    const row = (frame: PixelBuffer) => Array.from({ length: WIDTH }, (_, x) => frame.data[(2 * WIDTH + x) * 4]).join(',');
    expect(row(a.frame)).not.toBe(row(b.frame));
  });

  describe('figures', () => {
    const RED = solid(255, 0, 0);
    const figure = (id: number, x: number, y: number, pixels: PixelBuffer = RED, look = 0): RenderSprite => ({
      id, center: { x, y }, width: 60, look,
      images: { front: pixels, right: pixels, left: pixels, back: pixels },
      fallback: pixels,
    });
    /** A figure with a different color on each side: front red, right blue, left green, back yellow (035). */
    const sides = (): ViewImages<PixelBuffer> => ({
      front: solid(255, 0, 0), right: solid(0, 0, 255), left: solid(0, 255, 0), back: solid(255, 255, 0),
    });
    const spriteWith = (look: number, x: number, y: number, id = 1): RenderSprite => ({
      id, center: { x, y }, width: 60, look, images: sides(), fallback: solid(0, 0, 0),
    });
    const isRed = (pixel: number[]) => pixel[0] > 100 && pixel[1] < 40 && pixel[2] < 40;
    const isGreen = (pixel: number[]) => pixel[1] > 100 && pixel[0] < 40 && pixel[2] < 40;
    const isBlue = (pixel: number[]) => pixel[2] > 100 && pixel[0] < 40 && pixel[1] < 40;
    const isYellow = (pixel: number[]) => pixel[0] > 100 && pixel[1] > 100 && pixel[2] < 40;
    const isAnySide = (pixel: number[]) => isRed(pixel) || isGreen(pixel) || isBlue(pixel) || isYellow(pixel);
    const isWhite = (pixel: number[]) => pixel[0] > 100 && pixel[1] > 100 && pixel[2] > 100;
    const piece = { x: 250, y: 300 };
    // Four cameras 150 px from the piece, each looking straight at it.
    const SOUTH: CameraPose = { x: 250, z: 450, yaw: 0, attached: false };
    const NORTH: CameraPose = { x: 250, z: 150, yaw: Math.PI, attached: false };
    const EAST: CameraPose = { x: 400, z: 300, yaw: -Math.PI / 2, attached: false };
    const WEST: CameraPose = { x: 100, z: 300, yaw: Math.PI / 2, attached: false };

    it('draws a figure in front of a wall, standing with its feet on the floor', () => {
      const { at } = render({ mask: wallRowMask(), sprites: [figure(1, 250, 300)] });

      expect(isRed(at(32, 22))).toBe(true);
    });

    it('hides a figure that stands behind the wall', () => {
      const { at } = render({ mask: wallRowMask(), sprites: [figure(1, 250, 50)] });

      expect(isRed(at(32, 18))).toBe(false);
    });

    it('hides only the columns a wall covers: the figure shows past the end of the wall', () => {
      // A wall only in the left half of the row (cells 0–1); the figure sits behind it, ahead and to the right.
      const pixels = new Uint8ClampedArray(5 * 5 * 4).fill(255);
      for (const x of [0, 1]) pixels.set([0, 0, 0, 255], (1 * 5 + x) * 4);
      const mask = buildMaskGrid(pixels, 5, 5, AREA);
      const { at } = render({ mask, sprites: [{ ...figure(1, 280, 50), width: 400 }] }, { ...camera, x: 250 });

      const reds = Array.from({ length: WIDTH }, (_, x) => isRed(at(x, 20)));
      expect(reds.some(Boolean)).toBe(true);
      expect(reds.every(Boolean)).toBe(false);
    });

    it('draws the nearer figure over the farther one', () => {
      const far = figure(1, 250, 250, solid(0, 255, 0));
      const near = figure(2, 250, 350);

      const { at } = render({ sprites: [near, far] });

      expect(isRed(at(32, 24))).toBe(true);
    });

    it('leaves transparent pixels of a figure alone', () => {
      const clear = figure(1, 250, 300, solid(255, 0, 0, 0));
      const { at } = render({ sprites: [clear] });

      expect(isRed(at(32, 22))).toBe(false);
    });

    describe('the side the camera sees (035)', () => {
      const seenFrom = (pose: CameraPose, look: number, x = piece.x, y = piece.y) =>
        render({ sprites: [spriteWith(look, x, y)] }, pose).at(32, 22);

      it('a piece facing north shows its front to the north, its back to the south, right to the east, left to the west', () => {
        expect(isRed(seenFrom(NORTH, 0))).toBe(true);
        expect(isYellow(seenFrom(SOUTH, 0))).toBe(true);
        expect(isBlue(seenFrom(EAST, 0))).toBe(true);
        expect(isGreen(seenFrom(WEST, 0))).toBe(true);
      });

      it('the same camera shows another side when the piece turns on the map', () => {
        // The camera stands to the south: facing north it sees his back, facing south his front.
        expect(isYellow(seenFrom(SOUTH, 0))).toBe(true);
        expect(isRed(seenFrom(SOUTH, 3))).toBe(true);
      });

      it('two pieces facing different ways show different sides in the same frame', () => {
        const west = spriteWith(0, 200, 300); // facing north, the camera to the south: his back (yellow)
        const east = spriteWith(3, 300, 300, 2); // facing south: his front (red)
        const { frame } = render({ sprites: [west, east] });

        const columnsOf = (matches: (pixel: number[]) => boolean): number[] => {
          const columns: number[] = [];
          for (let x = 0; x < WIDTH; x++) {
            for (let y = 0; y < HEIGHT; y++) {
              if (matches([...frame.data.slice((y * WIDTH + x) * 4, (y * WIDTH + x) * 4 + 4)])) { columns.push(x); break; }
            }
          }
          return columns;
        };

        const yellow = columnsOf(isYellow);
        const red = columnsOf(isRed);

        expect(yellow.length).toBeGreaterThan(0);
        expect(red.length).toBeGreaterThan(0);
        expect(Math.max(...yellow)).toBeLessThan(32);
        expect(Math.min(...red)).toBeGreaterThan(32);
      });

      it('keeps the same size and place when the figure changes image', () => {
        const boxOf = (frame: PixelBuffer) => {
          const box = { left: WIDTH, right: -1, top: HEIGHT, bottom: -1 };
          for (let x = 0; x < WIDTH; x++) {
            for (let y = 0; y < HEIGHT; y++) {
              if (!isAnySide([...frame.data.slice((y * WIDTH + x) * 4, (y * WIDTH + x) * 4 + 4)])) continue;
              box.left = Math.min(box.left, x);
              box.right = Math.max(box.right, x);
              box.top = Math.min(box.top, y);
              box.bottom = Math.max(box.bottom, y);
            }
          }
          return box;
        };

        // The same piece seen from the south (back) or turned a third of a circle (a side): the box does not move.
        expect(boxOf(render({ sprites: [spriteWith(0, piece.x, piece.y)] }, SOUTH).frame))
          .toEqual(boxOf(render({ sprites: [spriteWith(2, piece.x, piece.y)] }, SOUTH).frame));
      });

      it('still hides a figure behind a wall while picking its side', () => {
        const { at } = render({ mask: wallRowMask(), sprites: [spriteWith(0, 250, 50)] }, SOUTH);

        expect(isYellow(at(32, 18))).toBe(false);
      });
    });

    describe('the reserve when a side has no image (035)', () => {
      const NONE: ViewImages<PixelBuffer> = { front: null, right: null, left: null, back: null };
      const WHITE = solid(255, 255, 255);
      /** A figure whose first column is red and the rest blue: where the red lands says if it was mirrored. */
      const marked = (): PixelBuffer => {
        const size = 4;
        const data = new Uint8ClampedArray(size * size * 4);
        for (let y = 0; y < size; y++) {
          for (let x = 0; x < size; x++) data.set(x === 0 ? [255, 0, 0, 255] : [0, 0, 255, 255], (y * size + x) * 4);
        }
        return { data, width: size, height: size };
      };
      /** Where the red column of the texture sits in the drawn figure: left = direct, right = mirrored, none = not drawn. */
      const markSide = (images: ViewImages<PixelBuffer>, pose: CameraPose, look = 0): 'left' | 'right' | 'none' => {
        const { frame } = render({ sprites: [{ id: 1, center: piece, width: 60, look, images, fallback: WHITE }] }, pose);
        let boxLeft = WIDTH, boxRight = -1, redLeft = WIDTH, redRight = -1;
        for (let x = 0; x < WIDTH; x++) {
          for (let y = 0; y < HEIGHT; y++) {
            const pixel = [...frame.data.slice((y * WIDTH + x) * 4, (y * WIDTH + x) * 4 + 4)];
            if (!isRed(pixel) && !isBlue(pixel)) continue;
            boxLeft = Math.min(boxLeft, x);
            boxRight = Math.max(boxRight, x);
            if (isRed(pixel)) { redLeft = Math.min(redLeft, x); redRight = Math.max(redRight, x); }
          }
        }
        if (boxRight < boxLeft) return 'none';
        return redLeft - boxLeft <= boxRight - redRight ? 'left' : 'right';
      };
      const seen = (images: ViewImages<PixelBuffer>, pose: CameraPose) =>
        render({ sprites: [{ id: 1, center: piece, width: 60, look: 0, images, fallback: WHITE }] }, pose).at(32, 22);

      it('a side without an image draws the opposite one mirrored, and its own image direct', () => {
        const onlyRight: ViewImages<PixelBuffer> = { ...NONE, right: marked() };
        const onlyLeft: ViewImages<PixelBuffer> = { ...NONE, left: marked() };

        // The camera to the west sees his left side, to the east his right side.
        expect(markSide(onlyRight, WEST)).toBe('right'); // his left, mirrored from the right drawing
        expect(markSide(onlyRight, EAST)).toBe('left');  // his right, as drawn
        expect(markSide(onlyLeft, EAST)).toBe('right');  // his right, mirrored from the left drawing
        expect(markSide(onlyLeft, WEST)).toBe('left');   // his left, as drawn
      });

      it('with both laterals, neither is mirrored', () => {
        const both: ViewImages<PixelBuffer> = { ...NONE, right: marked(), left: marked() };

        expect(markSide(both, EAST)).toBe('left');
        expect(markSide(both, WEST)).toBe('left');
      });

      it('without a back, seen from behind it shows the front, not mirrored', () => {
        expect(markSide({ ...NONE, front: marked() }, SOUTH)).toBe('left');
      });

      it('front and back without laterals: the sides show the front', () => {
        const frontAndBack: ViewImages<PixelBuffer> = { front: marked(), right: null, left: null, back: solid(0, 255, 0) };

        expect(markSide(frontAndBack, EAST)).toBe('left');
        expect(markSide(frontAndBack, WEST)).toBe('left');
        // and from behind it still draws the back, not the front
        expect(isGreen(seen(frontAndBack, SOUTH))).toBe(true);
      });

      it('without a front, the sides that have no image use the reserve (the standing image)', () => {
        expect(isWhite(seen({ ...NONE, back: solid(255, 255, 0) }, NORTH))).toBe(true);
        expect(isWhite(seen({ ...NONE, back: solid(255, 255, 0) }, EAST))).toBe(true);
        expect(isWhite(seen({ ...NONE, back: solid(255, 255, 0) }, WEST))).toBe(true);
        expect(isYellow(seen({ ...NONE, back: solid(255, 255, 0) }, SOUTH))).toBe(true);
      });

      it('a token with no "2,5D" image at all draws the reserve in every side (SC-005)', () => {
        for (const pose of [NORTH, SOUTH, EAST, WEST]) expect(isWhite(seen(NONE, pose))).toBe(true);
      });

      it('the reserve also covers a side whose own image failed to load', () => {
        // StoryView hands a null pixels buffer for an image it could not read.
        expect(isWhite(seen(NONE, EAST))).toBe(true);
        expect(markSide({ ...NONE, right: marked() }, EAST)).toBe('left');
      });
    });
  });
});
