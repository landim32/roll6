import { describe, expect, it } from 'vitest';
import { SHADOW_ALPHA, drawRaycastFrame, skyGradient } from './raycastFrame';
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

/** A mask from rows of text, one pixel per cell: '#' whole wall, '.' empty, '=' half gray, '-' almost white (036). */
const toneMask = (rows: string[], area = AREA) => {
  const TONES: Record<string, number> = { '#': 0, '.': 255, '=': 128, '-': 245, '~': 200 };
  const width = rows[0].length;
  const pixels = new Uint8ClampedArray(width * rows.length * 4);
  rows.forEach((line, y) => [...line].forEach((ch, x) => {
    const value = TONES[ch] ?? 255;
    pixels.set([value, value, value, 255], (y * width + x) * 4);
  }));
  return buildMaskGrid(pixels, width, rows.length, area);
};

/** A panorama of one bright green: the sky, so the wall rows and the floor rows are recognizable by their channels. */
const GREEN_SKY: PixelBuffer = {
  data: new Uint8ClampedArray(Array.from({ length: 4 * 4 }, () => [0, 250, 0, 255]).flat()),
  width: 4,
  height: 4,
};
const isWallPixel = (pixel: number[]): boolean => pixel[0] > pixel[1] && pixel[1] >= pixel[2];
const isSkyPixel = (pixel: number[]): boolean => pixel[1] > 200 && pixel[0] < 100;
const isFloorPixel = (pixel: number[]): boolean => pixel[2] > pixel[0] && !isSkyPixel(pixel);

/** How many rows of one column the walls paint. */
const wallRows = (at: (x: number, y: number) => number[], column = 32): number => {
  let rows = 0;
  for (let y = 0; y < HEIGHT; y++) if (isWallPixel(at(column, y))) rows += 1;
  return rows;
};

const solid = (r: number, g: number, b: number, a = 255, size = 4): PixelBuffer => ({
  data: new Uint8ClampedArray(Array.from({ length: size * size }, () => [r, g, b, a]).flat()),
  width: size,
  height: size,
});

const camera: CameraPose = { x: 250, z: 450, yaw: 0, attached: false };

const render = (scene: Partial<FrameScene>, pose: CameraPose = camera) => {
  const frame: PixelBuffer = { data: new Uint8ClampedArray(WIDTH * HEIGHT * 4), width: WIDTH, height: HEIGHT };
  const result = drawRaycastFrame(frame, { mask: null, map: null, background: null, sprites: [], ...scene }, pose, 70, skyGradient(HEIGHT / 2));
  const at = (x: number, y: number) => [...frame.data.slice((y * WIDTH + x) * 4, (y * WIDTH + x) * 4 + 4)];
  return { at, frame, result };
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

  it('paints a straight wall as a flat band, the same rows in every column', () => {
    const scene = { mask: wallRowMask(), background: { pixels: GREEN_SKY, repeats: 1 } };
    const { at } = render(scene);
    const bandOf = (column: number) => {
      const band = { top: HEIGHT, bottom: -1 };
      for (let y = 0; y < HEIGHT; y++) {
        if (!isWallPixel(at(column, y))) continue;
        band.top = Math.min(band.top, y);
        band.bottom = Math.max(band.bottom, y);
      }
      return band;
    };

    expect(bandOf(0)).toEqual(bandOf(32));
    expect(bandOf(63)).toEqual(bandOf(32));
    expect(bandOf(32).top).toBeLessThan(18); // a whole wall cuts the horizon
    expect(bandOf(32).bottom).toBeGreaterThan(18);
  });

  it('without walls the frame is sky above the horizon and ground below it', () => {
    const { at, result } = render({ background: { pixels: GREEN_SKY, repeats: 1 } });

    expect(isSkyPixel(at(32, 0))).toBe(true);
    expect(isSkyPixel(at(32, 17))).toBe(true);
    expect(wallRows(at)).toBe(0);
    expect(isFloorPixel(at(32, 30))).toBe(true);
    expect(result.sprites).toEqual([]);
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

    describe('what the frame drew, for the balloons (036)', () => {
      /** A wall of one cell in `row`: it covers the middle columns of whatever stands behind it. */
      const cellMask = (row: number) => {
        const pixels = new Uint8ClampedArray(5 * 5 * 4).fill(255);
        pixels.set([0, 0, 0, 255], (row * 5 + 2) * 4);
        return buildMaskGrid(pixels, 5, 5, AREA);
      };

      it('says where a figure in front of the camera landed', () => {
        const { result } = render({ sprites: [figure(3, 250, 300)] });

        expect(result.frameWidth).toBe(WIDTH);
        expect(result.frameHeight).toBe(HEIGHT);
        expect(result.sprites).toHaveLength(1);
        expect(result.sprites[0].id).toBe(3);
        expect(result.sprites[0].screenX).toBeCloseTo(32, 0);
        expect(result.sprites[0].depth).toBeCloseTo(150, 0); // camera at z 450, piece at y 300
        expect(result.sprites[0].top).toBeLessThan(result.sprites[0].bottom);
        expect(result.sprites[0].headVisible).toBe(true);
      });

      it('leaves out a figure behind the camera', () => {
        expect(render({ sprites: [figure(1, 250, 500)] }).result.sprites).toEqual([]);
      });

      it('leaves out a figure the wall covers entirely', () => {
        expect(render({ mask: wallRowMask(), sprites: [figure(1, 250, 50)] }).result.sprites).toEqual([]);
      });

      it('keeps the balloon when the figure shows over the top of the wall that covers its middle', () => {
        const behind = { ...figure(9, 250, 50), width: 200 };
        const { result, at } = render({ mask: cellMask(1), sprites: [behind] });

        expect(result.sprites.map((sprite) => sprite.id)).toEqual([9]);
        expect(result.sprites[0].screenX).toBeCloseTo(32, 0);
        // (036) the wall is nearer but its top is lower on the screen than the head: the head is not behind it.
        expect(result.sprites[0].headVisible).toBe(true);
        // and it really was drawn: to the left of the covered columns the figure's red shows over the blue sky
        expect(at(21, 12)[0]).toBeGreaterThan(at(21, 12)[1]);
      });

      it('takes the balloon away when a nearer wall covers the head, even if the body shows at the sides', () => {
        // The same cell one row nearer, and a figure wide enough to stick out past its sides.
        const behind = { ...figure(9, 250, 50), width: 400 };
        const { result, at } = render({ mask: cellMask(2), sprites: [behind] });

        expect(result.sprites.map((sprite) => sprite.id)).toEqual([9]);
        expect(result.sprites[0].headVisible).toBe(false);
        expect(at(10, 8)[0]).toBeGreaterThan(60);  // the wing of the figure, in a column the cell does not cover
        expect(at(10, 8)[1]).toBeLessThan(30);
      });

      it('keeps the far figure first, with its id and distance', () => {
        const { result } = render({ sprites: [figure(1, 250, 250), figure(2, 250, 350)] });

        expect(result.sprites.map((sprite) => sprite.id)).toEqual([1, 2]);
        expect(result.sprites[0].depth).toBeGreaterThan(result.sprites[1].depth);
      });
    });
  });

  describe('the floor past the edge of the map image (036)', () => {
    /**
     * 4 × 4 image over AREA (0–500): every side a hue of its own, every corner a different one, the middle white — so a
     * floor sample says which texel it read.
     */
    const edgeMap = (transparentWest = false): PixelBuffer => {
      const rows = [
        [[255, 0, 255], [255, 0, 0], [255, 0, 0], [0, 255, 255]],
        [[255, 255, 0], [255, 255, 255], [255, 255, 255], [0, 255, 0]],
        [[255, 255, 0], [255, 255, 255], [255, 255, 255], [0, 255, 0]],
        [[255, 128, 0], [0, 0, 255], [0, 0, 255], [255, 128, 128]],
      ];
      const data = new Uint8ClampedArray(4 * 4 * 4);
      rows.forEach((row, y) => row.forEach((rgb, x) => data.set([...rgb, transparentWest && x === 0 ? 0 : 255], (y * 4 + x) * 4)));
      return { data, width: 4, height: 4 };
    };
    const withMap = (pixels: PixelBuffer) => ({ map: { pixels, area: AREA } });
    /** The color without its brightness: which texel the pixel came from. */
    const hueOf = (pixel: number[]): number[] => {
      const max = Math.max(pixel[0], pixel[1], pixel[2]);
      return max === 0 ? [0, 0, 0] : [pixel[0] / max, pixel[1] / max, pixel[2] / max];
    };
    const isHue = (pixel: number[], hue: number[]): boolean => {
      const seen = hueOf(pixel);
      expect(Math.max(pixel[0], pixel[1], pixel[2]), 'the floor is not black').toBeGreaterThan(0);
      return hue.every((value, i) => Math.abs(seen[i] - value) <= 0.05);
    };

    // Each camera puts the sampled floor point past one edge of the image (and inside it on the other axis).
    const NORTH: CameraPose = { x: 250, z: 60, yaw: 0, attached: false };
    const WEST: CameraPose = { x: 60, z: 450, yaw: 0, attached: false };
    const EAST: CameraPose = { x: 440, z: 450, yaw: 0, attached: false };
    const SOUTH: CameraPose = { x: 250, z: 60, yaw: Math.PI, attached: false };
    const CORNER: CameraPose = { x: 60, z: 60, yaw: 0, attached: false };

    it('past the top edge it keeps the color of that edge', () => {
      expect(isHue(render(withMap(edgeMap()), NORTH).at(32, 30), [1, 0, 0])).toBe(true);
    });

    it('past the left and the right edges each side keeps its own color', () => {
      expect(isHue(render(withMap(edgeMap()), WEST).at(0, 35), [1, 1, 0])).toBe(true);
      expect(isHue(render(withMap(edgeMap()), EAST).at(63, 35), [0, 1, 0])).toBe(true);
    });

    it('past the bottom edge it keeps the color of that edge', () => {
      expect(isHue(render(withMap(edgeMap()), SOUTH).at(32, 23), [0, 0, 1])).toBe(true);
    });

    it('in a corner it takes the corner pixel', () => {
      expect(isHue(render(withMap(edgeMap()), CORNER).at(0, 35), [1, 0, 1])).toBe(true);
    });

    it('inside the image nothing changes', () => {
      expect(isHue(render(withMap(edgeMap()), camera).at(32, 35), [1, 1, 1])).toBe(true);
    });

    it('a transparent edge pixel is the neutral floor, like having no image at all', () => {
      const transparent = render(withMap(edgeMap(true)), WEST).at(0, 35);
      const noImage = render({}, WEST).at(0, 35);

      expect(transparent).toEqual(noImage);
      expect(Math.max(...transparent.slice(0, 3))).toBeGreaterThan(0); // neutral, not black
    });

    it('a map with no image stays the neutral floor everywhere', () => {
      const { at } = render({});

      expect(at(32, 35)).toEqual(at(0, 35));
    });

    it('a wall that stands past the edge of the image takes the color of that edge too', () => {
      // A wall row north of the image, 700 px from the camera: only about five rows of screen (just under the horizon).
      const pixels = new Uint8ClampedArray(5 * 5 * 4).fill(255);
      for (let x = 0; x < 5; x++) pixels.set([0, 0, 0, 255], (0 * 5 + x) * 4);
      const mask = buildMaskGrid(pixels, 5, 5, { x: 0, y: -500, width: 500, height: 500 });

      const { at } = render({ mask, ...withMap(edgeMap()) }, { x: 250, z: 300, yaw: 0, attached: false });

      expect(isHue(at(32, 19), [1, 0, 0])).toBe(true);
    });
  });

  describe('the tone of the mask is the height of the wall (036)', () => {
    const SKY = { background: { pixels: GREEN_SKY, repeats: 1 } };
    // The camera at (250, 450) looking north over a 5 × 5 mask of 100 px cells: row 1 is 250 away, row 2 is 150,
    // row 3 is 50, and a wall of full height (120 units) reaches well above the horizon (row 18).
    const isRedden = (pixel: number[]): boolean => pixel[0] > 60 && pixel[1] < 30 && pixel[2] < 30;

    it('a half gray wall is half the height of a black one at the same distance (SC-004)', () => {
      const black = wallRows(render({ ...SKY, mask: toneMask(['.....', '#####', '.....', '.....', '.....']) }).at);
      const gray = wallRows(render({ ...SKY, mask: toneMask(['.....', '=====', '.....', '.....', '.....']) }).at);

      expect(black).toBeGreaterThan(10);
      expect(Math.abs(gray / black - 0.5)).toBeLessThanOrEqual(0.03);
    });

    it('a darker gray is taller and a lighter gray is shorter, in the same order as the tone', () => {
      const rows = (tone: string) => wallRows(render({ ...SKY, mask: toneMask(['.....', `${tone}${tone}${tone}${tone}${tone}`, '.....', '.....', '.....']) }).at);

      expect(rows('#')).toBeGreaterThan(rows('='));
      expect(rows('=')).toBeGreaterThan(rows('~'));
      expect(rows('-')).toBe(0); // almost white: no wall at all
    });

    it('over the top of a low wall one sees the wall behind, and the top of the low one is a surface, not a hole', () => {
      // A mureta a fifth of the height at row 2 (150 away) in front of a whole wall at row 0 (350 away).
      const { at } = render({ ...SKY, mask: toneMask(['#####', '.....', '~~~~~', '.....', '.....']) });

      expect(isSkyPixel(at(32, 5))).toBe(true);      // sky above the far wall
      expect(isWallPixel(at(32, 18))).toBe(true);    // the far wall, seen over the mureta
      expect(isWallPixel(at(32, 26))).toBe(true);    // the top of the mureta, between its face and the far wall (036)
      expect(isWallPixel(at(32, 27))).toBe(true);
      expect(isFloorPixel(at(32, 26))).toBe(false);  // no longer the ground showing through
      expect(isWallPixel(at(32, 30))).toBe(true);    // the mureta itself, down to the bottom of the frame
      // and the nearer one is the brighter of the two
      expect(at(32, 30)[0]).toBeGreaterThan(at(32, 18)[0]);
    });

    describe('the top of a low wall (036)', () => {
      // Row 4 of this map (y 200–250) is green and row 5 (y 250–300) is red: the two halves of the cell of row 2, so the
      // top of the mureta, seen from above, must show green in its far half and red in the near half.
      const stripedMap = (): PixelBuffer => {
        const size = 10;
        const data = new Uint8ClampedArray(size * size * 4);
        for (let row = 0; row < size; row++) {
          const color = row === 4 ? [0, 200, 0] : row === 5 ? [200, 0, 0] : [40, 40, 160];
          for (let col = 0; col < size; col++) data.set([...color, 255], (row * size + col) * 4);
        }
        return { data, width: size, height: size };
      };
      const kind = (pixel: number[]): 'green' | 'red' | 'other' =>
        pixel[1] > 100 && pixel[0] < 60 ? 'green' : pixel[0] > 100 && pixel[1] < 40 && pixel[2] < 40 ? 'red' : 'other';

      it('shows the part of the map image under the wall, far half above the near half', () => {
        const { at } = render({ mask: toneMask(['.....', '.....', '~~~~~', '.....', '.....']), map: { pixels: stripedMap(), area: AREA } });
        const rows = Array.from({ length: HEIGHT }, (_, y) => ({ y, kind: kind(at(32, y)) }));
        const greens = rows.filter((row) => row.kind === 'green').map((row) => row.y);
        const reds = rows.filter((row) => row.kind === 'red').map((row) => row.y);

        expect(greens.length).toBeGreaterThan(0);
        expect(reds.length).toBeGreaterThan(0);
        expect(Math.max(...greens)).toBeLessThan(Math.min(...reds));
      });

      it('ends where the wall ends: the ground goes on behind it', () => {
        const { at } = render({ ...SKY, mask: toneMask(['.....', '.....', '~~~~~', '.....', '.....']) });

        expect(isFloorPixel(at(32, 21))).toBe(true);   // the ground beyond the mureta, up to the horizon
        expect(isWallPixel(at(32, 26))).toBe(true);    // the top of the mureta
        expect(isSkyPixel(at(32, 10))).toBe(true);
      });

      it('is not drawn for a wall at the height of the eye or above: from its side the top cannot be seen', () => {
        // A half gray wall is a little taller than the camera's eyes: its top edge is at the horizon, nothing above it.
        const { at } = render({ ...SKY, mask: toneMask(['.....', '.....', '=====', '.....', '.....']) });

        expect(isSkyPixel(at(32, 14))).toBe(true);
        expect(isWallPixel(at(32, 25))).toBe(true);    // the face
      });
    });

    it('a figure behind a low wall shows above its top and disappears below it', () => {
      const pixels = solid(255, 0, 0);
      const piece: RenderSprite = {
        id: 1, center: { x: 250, y: 250 }, width: 60, look: 0,
        images: { front: pixels, right: pixels, left: pixels, back: pixels }, fallback: pixels,
      };
      // The figure stands between the mureta (150) and the far wall (350): its head is above the mureta's top.
      const { at, result } = render({ ...SKY, mask: toneMask(['#####', '.....', '~~~~~', '.....', '.....']), sprites: [piece] });

      expect(result.sprites.map((sprite) => sprite.id)).toEqual([1]);
      expect(result.sprites[0].headVisible).toBe(true);
      expect(isRedden(at(32, 22))).toBe(true);  // above the top of the mureta
      expect(isRedden(at(32, 31))).toBe(false); // its feet are behind the mureta
      expect(isWallPixel(at(32, 31))).toBe(true);
    });

    it('a figure behind a whole wall is still hidden from the first row down', () => {
      const pixels = solid(255, 0, 0);
      const piece: RenderSprite = {
        id: 1, center: { x: 250, y: 50 }, width: 60, look: 0,
        images: { front: pixels, right: pixels, left: pixels, back: pixels }, fallback: pixels,
      };

      const { at, result } = render({ ...SKY, mask: toneMask(['.....', '#####', '.....', '.....', '.....']), sprites: [piece] });

      expect(result.sprites).toEqual([]);
      for (let y = 0; y < HEIGHT; y++) expect(isRedden(at(32, y))).toBe(false);
    });
  });
});

describe('the shadow of a figure (036)', () => {
  // A figure with nothing opaque in it, so only its shadow shows. It stands 200 away from the camera (250, 450): its feet
  // are on row 31 and the shadow is about 6 columns wide on each side and 2 rows tall.
  const ghost = (x = 250, y = 250, width = 60): RenderSprite => {
    const pixels = solid(255, 0, 0, 0);
    return { id: 1, center: { x, y }, width, look: 0, images: { front: pixels, right: pixels, left: pixels, back: pixels }, fallback: pixels };
  };
  const brightness = (pixel: number[]) => pixel[0] + pixel[1] + pixel[2];

  it('darkens the floor under the feet, darkest in the middle and fading toward the edge', () => {
    const { at } = render({ sprites: [ghost()] });
    const bare = render({ sprites: [] }).at;

    const middle = brightness(at(32, 31)) / brightness(bare(32, 31));
    const edge = brightness(at(37, 31)) / brightness(bare(37, 31));
    expect(middle).toBeLessThan(0.6);
    expect(edge).toBeGreaterThan(middle);
    expect(edge).toBeLessThanOrEqual(1);
  });

  it('stays around the feet: the floor farther away is not touched', () => {
    const { at } = render({ sprites: [ghost()] });
    const bare = render({ sprites: [] }).at;

    expect(at(50, 31)).toEqual(bare(50, 31));
    expect(at(32, 24)).toEqual(bare(32, 24));       // the floor beyond the figure
    expect(at(32, 35)).toEqual(bare(32, 35));       // and the floor in front of it
  });

  it('never goes above the horizon', () => {
    const { at } = render({ sprites: [ghost()] });
    const bare = render({ sprites: [] }).at;

    for (let y = 0; y < 18; y++) expect(at(32, y)).toEqual(bare(32, y));
  });

  it('is as wide as the footprint of the figure: a bigger figure casts a bigger shadow', () => {
    const wide = (sprite: RenderSprite) => {
      const { at } = render({ sprites: [sprite] });
      const bare = render({ sprites: [] }).at;
      let columns = 0;
      for (let x = 0; x < WIDTH; x++) if (brightness(at(x, 31)) < brightness(bare(x, 31))) columns += 1;
      return columns;
    };

    expect(wide(ghost(250, 250, 160))).toBeGreaterThan(wide(ghost(250, 250, 60)));
    expect(SHADOW_ALPHA).toBeGreaterThan(0);
    expect(SHADOW_ALPHA).toBeLessThan(1);
  });

  it('is smaller for a farther figure', () => {
    const wide = (y: number) => {
      const { at } = render({ sprites: [ghost(250, y)] });
      const bare = render({ sprites: [] }).at;
      let columns = 0;
      for (let row = 18; row < HEIGHT; row++) for (let x = 0; x < WIDTH; x++) if (brightness(at(x, row)) < brightness(bare(x, row))) columns += 1;
      return columns;
    };

    expect(wide(300)).toBeGreaterThan(wide(50));
  });

  it('is hidden by a wall that is nearer, like the figure', () => {
    const behind = { x: 250, y: 50 };
    const { at } = render({ mask: toneMask(['.....', '#####', '.....', '.....', '.....']), sprites: [ghost(behind.x, behind.y)] });
    const bare = render({ mask: toneMask(['.....', '#####', '.....', '.....', '.....']), sprites: [] }).at;

    for (let y = 0; y < HEIGHT; y++) expect(at(32, y)).toEqual(bare(32, y));
  });

  it('a figure that is down on the floor behind another one does not hide the shadow of the nearer one', () => {
    const { at } = render({ sprites: [ghost(250, 250), { ...ghost(250, 350), id: 2 }] });
    const bare = render({ sprites: [] }).at;

    expect(brightness(at(32, 31))).toBeLessThan(brightness(bare(32, 31)) * 0.6);
  });
});

/**
 * The reference frame of 036 (FR-008, research D8): a scene whose mask is pure black and white, rendered by the code
 * of 035, pinned by checksum and by six pixels. The wall height by tone (US4) rewrites how a frame is painted — the
 * multi-face ray, the back-to-front painting and the per-row occlusion — and for a black and white mask all of that
 * must land on exactly these bytes. The values were captured before any of that was touched.
 *
 * The map image covers a area far bigger than what the camera can reach, so no floor or wall color is ever read
 * outside it: the reference says nothing about the floor beyond the edge (US2 has its own tests).
 */
describe('reference frame (máscara só 0/255)', () => {
  const REF_WIDTH = 48;
  const REF_HEIGHT = 28;
  const MASK_AREA = { x: 0, y: 0, width: 500, height: 500 };
  const MAP_AREA = { x: -4000, y: -4000, width: 9000, height: 9000 };
  const POSE: CameraPose = { x: 250, z: 300, yaw: 0, attached: false };

  /** 5 × 5 mask of pure black and white: the four borders are wall, the inside is empty. */
  const boxMask = () => {
    const pixels = new Uint8ClampedArray(5 * 5 * 4).fill(255);
    for (let i = 0; i < 25; i++) {
      const x = i % 5;
      const y = Math.floor(i / 5);
      if (x === 0 || y === 0 || x === 4 || y === 4) pixels.set([0, 0, 0, 255], i * 4);
    }
    return buildMaskGrid(pixels, 5, 5, MASK_AREA);
  };

  /** 4 × 4 map image, every texel a different color. */
  const colorMap = (): PixelBuffer => {
    const data = new Uint8ClampedArray(4 * 4 * 4);
    for (let y = 0; y < 4; y++) {
      for (let x = 0; x < 4; x++) data.set([40 + x * 60, 200 - y * 40, 90 + ((x + y) % 4) * 30, 255], (y * 4 + x) * 4);
    }
    return { data, width: 4, height: 4 };
  };

  /** A figure in front of the camera: red left column, blue the rest, one transparent pixel, only its front drawn. */
  const figure = (): RenderSprite => {
    const data = new Uint8ClampedArray(4 * 4 * 4);
    for (let y = 0; y < 4; y++) {
      for (let x = 0; x < 4; x++) {
        data.set(x === 0 ? [255, 0, 0, 255] : y === 3 && x === 3 ? [0, 0, 0, 0] : [0, 0, 255, 255], (y * 4 + x) * 4);
      }
    }
    const pixels: PixelBuffer = { data, width: 4, height: 4 };
    return { id: 7, center: { x: 250, y: 200 }, width: 60, look: 0, images: { front: pixels, right: null, left: null, back: null }, fallback: pixels };
  };

  const renderReference = (): PixelBuffer => {
    const frame: PixelBuffer = { data: new Uint8ClampedArray(REF_WIDTH * REF_HEIGHT * 4), width: REF_WIDTH, height: REF_HEIGHT };
    const scene: FrameScene = { mask: boxMask(), map: { pixels: colorMap(), area: MAP_AREA }, background: null, sprites: [figure()] };
    drawRaycastFrame(frame, scene, POSE, 70, skyGradient(Math.round(REF_HEIGHT / 2)));
    return frame;
  };

  /** Sum of every byte and an FNV-1a 32 bits hash over the frame's RGBA bytes. */
  const checksum = (data: Uint8ClampedArray): { sum: number; hash: number } => {
    let sum = 0;
    let hash = 0x811c9dc5;
    for (let i = 0; i < data.length; i++) {
      sum += data[i];
      hash = Math.imul(hash ^ data[i], 0x01000193) >>> 0;
    }
    return { sum, hash };
  };

  it('keeps the same bytes, hash and sample pixels as the 035 renderer', () => {
    const frame = renderReference();
    const { sum, hash } = checksum(frame.data);
    const at = (x: number, y: number) => [...frame.data.slice((y * REF_WIDTH + x) * 4, (y * REF_WIDTH + x) * 4 + 4)];

    expect(sum).toBe(619251);
    expect(hash).toBe(4240962842);
    expect(at(24, 0)).toEqual([18, 22, 40, 255]);   // sky, above the wall
    expect(at(2, 6)).toEqual([53, 85, 79, 255]);    // the far wall, colored by the map image
    expect(at(24, 12)).toEqual([53, 85, 79, 255]);  // the wall straight ahead
    expect(at(46, 20)).toEqual([53, 85, 79, 255]);  // the wall at the right of the screen
    expect(at(24, 22)).toEqual([0, 0, 211, 255]);   // the figure, in front of the wall
    expect(at(4, 27)).toEqual([76, 122, 114, 255]); // the floor, in perspective, below the wall
  });
});
