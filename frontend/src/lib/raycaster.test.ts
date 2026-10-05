import { describe, expect, it } from 'vitest';
import { FACE_HEIGHT_SHARE, FRONT_IMAGE_ASPECT, SILHOUETTE_SHARE } from './frontImage';
import { HEX_SIZE } from './hexGrid';
import {
  buildMaskGrid, castRay, columnAngle, columnVisible, EYE_HEIGHT, floorPoint, isWallAt, MAX_FACES_PER_RAY,
  perpendicularDistance, projectionOf, projectSprite, shade, skyColumn, skyRepeats, WALL_HEIGHT, wallColumn,
} from './raycaster';
import type { CameraPose, MaskGrid } from './raycaster';

/**
 * A mask from rows of text, one pixel per cell, covering `area`: '#' whole wall, '.' empty, '=' half gray,
 * '-' almost white (036 reads the tone as the height).
 */
const gridFrom = (rows: string[], area = { x: 0, y: 0, width: rows[0].length * 100, height: rows.length * 100 }): MaskGrid => {
  const TONES: Record<string, number> = { '#': 0, '.': 255, '=': 128, '-': 245 };
  const width = rows[0].length;
  const pixels = new Uint8ClampedArray(width * rows.length * 4);
  rows.forEach((line, y) => [...line].forEach((ch, x) => {
    const value = TONES[ch] ?? 255;
    pixels.set([value, value, value, 255], (y * width + x) * 4);
  }));
  return buildMaskGrid(pixels, width, rows.length, area);
};

/** One cell made of the given gray values: what the softened edge of a black and white mask looks like. */
const cellOf = (grays: number[]): MaskGrid => {
  const pixels = new Uint8ClampedArray(grays.length * 4);
  grays.forEach((g, x) => pixels.set([g, g, g, 255], x * 4));
  return buildMaskGrid(pixels, grays.length, 1, { x: 0, y: 0, width: grays.length, height: 1 }, 1);
};

const north: CameraPose = { x: 250, z: 450, yaw: 0, attached: false };

describe('buildMaskGrid', () => {
  it('turns dark pixels into whole walls on a grid that covers the given area', () => {
    const grid = gridFrom(['#.', '.#'], { x: -50, y: 20, width: 400, height: 200 });

    expect(grid).toMatchObject({ cols: 2, rows: 2, originX: -50, originY: 20, cellWidth: 200, cellHeight: 100 });
    expect([...grid.heights]).toEqual([255, 0, 0, 255]);
  });

  it('reduces a big mask to at most 512 cells on its longest side; a cell is wall when most of its pixels are', () => {
    const width = 1024;
    const height = 512;
    const pixels = new Uint8ClampedArray(width * height * 4).fill(255);
    // Wall on the left half of the first 2×2 block of source pixels only → 3 of 4 is most, 2 of 4 is not.
    for (const [x, y] of [[0, 0], [1, 0], [0, 1]]) pixels.set([0, 0, 0, 255], (y * width + x) * 4);

    const grid = buildMaskGrid(pixels, width, height, { x: 0, y: 0, width, height });

    expect(grid.cols).toBe(512);
    expect(grid.rows).toBe(256);
    expect(grid.heights[0]).toBe(255); // 3 of 4 are dark
    expect(grid.heights[1]).toBe(0);
  });

  it('keeps a small mask at its own size', () => {
    expect(gridFrom(['..', '..']).cols).toBe(2);
  });

  it('reads the tone of the mask as the height of the wall (036)', () => {
    const grid = gridFrom(['#=.-']);

    expect(grid.heights[0] / 255).toBe(1); // black: whole wall
    expect(grid.heights[1] / 255).toBeCloseTo(0.5, 1); // half gray: half wall
    expect(grid.heights[2]).toBe(0); // white: empty
    expect(grid.heights[3]).toBe(0); // 245 of 255: empty, the end of the range is snapped
  });

  it('takes the median, so the softened edge of a black and white mask is never half a wall', () => {
    expect(cellOf([0, 0, 255, 255]).heights[0]).toBe(0); // an even split is empty, as the old rule
    expect(cellOf([0, 0, 0, 255]).heights[0]).toBe(255); // mostly dark: a whole wall
    expect(cellOf([0, 255, 255, 255]).heights[0]).toBe(0);
    // Ten pixels, a third dark: the average would ask for a wall 2/3 of its height; the median says empty.
    expect(cellOf([0, 0, 0, 255, 255, 255, 255, 255, 255, 255]).heights[0]).toBe(0);
    expect(cellOf([255, 255, 0, 0]).heights[0]).toBe(0);
  });

  it('counts transparent pixels as empty, however dark they are', () => {
    const pixels = new Uint8ClampedArray([0, 0, 0, 0, 0, 0, 0, 255]);
    const grid = buildMaskGrid(pixels, 2, 1, { x: 0, y: 0, width: 2, height: 1 }, 2);

    expect(grid.heights[0]).toBe(0); // transparent
    expect(grid.heights[1]).toBe(255); // the same black, opaque
  });
});

describe('isWallAt', () => {
  const grid = gridFrom(['...', '.#.', '...'], { x: 100, y: 100, width: 300, height: 300 });

  it('is true inside a wall cell and false elsewhere, including outside the mask', () => {
    expect(isWallAt(grid, 250, 250)).toBe(true);
    expect(isWallAt(grid, 150, 150)).toBe(false);
    expect(isWallAt(grid, 50, 250)).toBe(false);
    expect(isWallAt(grid, 450, 250)).toBe(false);
  });

  it('is true for a low wall too: the camera never walks through one (036)', () => {
    const low = gridFrom(['=.', '#.'], { x: 0, y: 0, width: 200, height: 200 });

    expect(isWallAt(low, 50, 50)).toBe(true); // half gray
    expect(isWallAt(low, 150, 50)).toBe(false); // white: empty
    expect(isWallAt(low, 50, 150)).toBe(true); // black
  });
});

describe('castRay', () => {
  // Cells are 100 × 100; a wall row at y 100–200 (row 1), the camera at (250, 450) looking north.
  const grid = gridFrom(['.....', '#####', '.....', '.....', '.....']);

  it('hits the wall straight ahead at the right distance and side', () => {
    const hits = castRay(grid, 250, 450, 0, 2000);

    expect(hits).toHaveLength(1);
    expect(hits[0].distance).toBeCloseTo(250); // from y 450 to the wall's south face at y 200
    expect(hits[0].x).toBeCloseTo(250);
    expect(hits[0].y).toBeCloseTo(200);
    expect(hits[0].side).toBe('ns');
    expect(hits[0].height).toBe(1);
  });

  it('sees the same wall from the other side', () => {
    const hits = castRay(grid, 250, 50, Math.PI, 2000);

    expect(hits[0].distance).toBeCloseTo(50);
    expect(hits[0].y).toBeCloseTo(100);
  });

  it('hits side faces with a diagonal ray', () => {
    const walled = gridFrom(['..#..', '..#..', '..#..', '..#..', '..#..']);
    const hits = castRay(walled, 50, 250, Math.PI / 2, 2000); // facing east

    expect(hits[0].distance).toBeCloseTo(150);
    expect(hits[0].side).toBe('ew');
  });

  it('returns nothing when no wall is in range', () => {
    expect(castRay(grid, 250, 450, 0, 200)).toEqual([]);
    expect(castRay(grid, 250, 450, Math.PI, 2000)).toEqual([]); // faces south, empty
  });

  it('ignores the cell the ray starts in', () => {
    expect(castRay(grid, 250, 150, Math.PI, 2000)).toEqual([]); // standing inside the wall row, looking south
  });

  it('lets a ray from outside the mask enter it and hit', () => {
    const hits = castRay(grid, 250, 900, 0, 5000);

    expect(hits[0].y).toBeCloseTo(200);
    expect(hits[0].distance).toBeCloseTo(700);
  });

  describe('the faces behind a low wall (036)', () => {
    it('keeps going over a low wall and returns the faces near to far, each taller than the last', () => {
      // A half-height wall at row 3 and a whole one at row 1: the camera at (250, 450) sees both, in that order.
      const hits = castRay(gridFrom(['.....', '#####', '.....', '=====', '.....']), 250, 450, 0, 2000);

      expect(hits).toHaveLength(2);
      expect(hits[0].distance).toBeCloseTo(50); // the near face of the low wall
      expect(hits[0].height).toBeCloseTo(0.5, 1);
      expect(hits[1].distance).toBeCloseTo(250);
      expect(hits[1].height).toBe(1);
    });

    it('stops at a wall of full height: nothing behind it is returned', () => {
      const hits = castRay(gridFrom(['.....', '=====', '.....', '#####', '.....']), 250, 450, 0, 2000);

      expect(hits).toHaveLength(1);
      expect(hits[0].height).toBe(1);
    });

    it('does not return a lower wall behind a taller one', () => {
      // The whole wall at row 3 (near) and a low one at row 1 (far), from the camera at (250, 450) looking north.
      const hits = castRay(gridFrom(['..=..', '.....', '.....', '#####', '.....']), 250, 450, 0, 2000);

      expect(hits).toHaveLength(1);
      expect(hits[0].height).toBe(1);
    });

    it('keeps at most eight faces', () => {
      // Twelve rows of grays, each taller than the one before it, seen from the south end going north.
      const pixels = new Uint8ClampedArray(12 * 4);
      for (let y = 0; y < 12; y++) {
        const value = y * 20; // row 0 is black (whole wall), row 11 almost white
        pixels.set([value, value, value, 255], y * 4);
      }
      const many = buildMaskGrid(pixels, 1, 12, { x: 0, y: 0, width: 100, height: 1200 }, 12);

      expect(many).toMatchObject({ cols: 1, rows: 12, cellWidth: 100, cellHeight: 100 });
      const hits = castRay(many, 50, 1150, 0, 5000);

      expect(hits).toHaveLength(MAX_FACES_PER_RAY);
      expect(hits.every((hit, i) => i === 0 || hit.height > hits[i - 1].height)).toBe(true);
      expect(hits[0].distance).toBeCloseTo(50);
    });

    it('a mask that is only black and white still gives at most one face', () => {
      for (const angle of [0, Math.PI / 6, Math.PI / 2, Math.PI, -Math.PI / 3]) {
        expect(castRay(grid, 250, 450, angle, 3000).length).toBeLessThanOrEqual(1);
      }
    });
  });
});

describe('projection', () => {
  const frame = { width: 480, height: 270 };
  const projection = projectionOf(frame.width, 90);

  it('puts the projection plane half a frame away for a 90° field of view', () => {
    expect(projection).toBeCloseTo(240);
  });

  it('gives the center column no offset and the edge columns half the field of view', () => {
    expect(columnAngle(239.5, frame.width, projection)).toBeCloseTo(0);
    expect(columnAngle(0, frame.width, projection)).toBeCloseTo(-Math.atan(239.5 / 240));
  });

  it('removes the fish-eye: a wall straight across has the same perpendicular distance in every column', () => {
    // A flat wall 300 units ahead is hit at 300 / cos(angle) along each ray.
    for (const column of [0, 100, 240, 400, 479]) {
      const offset = columnAngle(column, frame.width, projection);
      const hit = { distance: 300 / Math.cos(offset), x: 0, y: 0, side: 'ns' as const, height: 1 };
      expect(perpendicularDistance(hit, offset)).toBeCloseTo(300);
    }
  });
});

describe('camera height', () => {
  // A figure of 1 hex is as wide as a hex (2 × HEX_SIZE) and its "2,5D frente" image is a 3:4 portrait.
  const imageHeight = (2 * HEX_SIZE) / FRONT_IMAGE_ASPECT;
  const characterHeight = SILHOUETTE_SHARE * imageHeight;

  it('is the eye level of the character that fits the silhouette of the front image', () => {
    expect(EYE_HEIGHT).toBeCloseTo(FACE_HEIGHT_SHARE * imageHeight);
    expect(EYE_HEIGHT).toBeCloseTo(59.73, 1);
  });

  it('is at the face, not above the head: a little under the height of the character, well above the waist', () => {
    expect(EYE_HEIGHT).toBeLessThan(characterHeight);
    expect(EYE_HEIGHT).toBeGreaterThan(characterHeight * 0.9);
  });

  it('keeps the walls taller than the eyes so the horizon cuts them', () => {
    expect(WALL_HEIGHT).toBeGreaterThan(EYE_HEIGHT);
  });
});

describe('wallColumn', () => {
  const projection = 240;

  it('makes closer walls taller, centered on the horizon below the eye line', () => {
    const near = wallColumn(100, 270, projection);
    const far = wallColumn(400, 270, projection);

    expect(near.bottom - near.top).toBeGreaterThan(far.bottom - far.top);
    expect(near.bottom - near.top).toBeCloseTo((WALL_HEIGHT * projection) / 100);
    expect(near.bottom).toBeCloseTo(135 + (EYE_HEIGHT * projection) / 100);
    expect(near.top).toBeCloseTo(135 - ((WALL_HEIGHT - EYE_HEIGHT) * projection) / 100);
  });

  it('is symmetrical in distance: twice as far, half as tall', () => {
    const a = wallColumn(200, 270, projection);
    const b = wallColumn(400, 270, projection);

    expect((a.bottom - a.top) / (b.bottom - b.top)).toBeCloseTo(2);
  });

  it('draws only the part of a low wall, standing on the same floor (036)', () => {
    const whole = wallColumn(200, 270, projection);
    const tall = wallColumn(200, 270, projection, 0.9);
    const low = wallColumn(200, 270, projection, 0.4);

    expect(low.bottom).toBeCloseTo(whole.bottom); // every wall reaches the floor
    expect(low.top).toBeGreaterThan(whole.top); // the shorter the wall, the closer its top is to the horizon
    expect(tall.top).toBeGreaterThan(whole.top);
    // A wall shorter than the camera's eyes has its top UNDER the horizon: the ground behind it shows between the top
    // of the wall and the horizon (EYE_HEIGHT is 59.7 of the 120 of a whole wall).
    expect(WALL_HEIGHT * 0.4).toBeLessThan(EYE_HEIGHT);
    expect(low.top).toBeGreaterThan(135);
    expect(whole.top).toBeLessThan(135);
  });

  it('is the same column as before when the height is left out (the old black and white mask)', () => {
    expect(wallColumn(200, 270, projection)).toEqual(wallColumn(200, 270, projection, 1));
  });
});

describe('shade', () => {
  it('darkens with distance and darkens north/south faces', () => {
    expect(shade(0)).toBeCloseTo(1);
    expect(shade(1000)).toBeLessThan(shade(100));
    expect(shade(100, 'ns')).toBeCloseTo(shade(100, 'ew') * 0.75);
  });
});

describe('floorPoint', () => {
  const frame = { width: 480, height: 270 };
  const projection = projectionOf(frame.width, 90);

  it('has no floor at or above the horizon', () => {
    expect(floorPoint(north, 240, 134, frame.width, frame.height, projection)).toBeNull();
    expect(floorPoint(north, 240, 0, frame.width, frame.height, projection)).toBeNull();
  });

  it('puts the bottom center of the screen ahead of the camera and the sides to its left and right', () => {
    const center = floorPoint(north, 240, 269, frame.width, frame.height, projection)!;
    const left = floorPoint(north, 0, 269, frame.width, frame.height, projection)!;
    const right = floorPoint(north, 479, 269, frame.width, frame.height, projection)!;

    expect(center.y).toBeLessThan(north.z); // north is −y
    expect(left.x).toBeLessThan(center.x);
    expect(right.x).toBeGreaterThan(center.x);
    expect(center.x).toBeCloseTo(north.x, 0);
  });

  it('is farther the closer the row is to the horizon', () => {
    const near = floorPoint(north, 240, 260, frame.width, frame.height, projection)!;
    const far = floorPoint(north, 240, 140, frame.width, frame.height, projection)!;

    expect(far.depth).toBeGreaterThan(near.depth);
  });

  it('turns with the camera: facing east, ahead is +x', () => {
    const east: CameraPose = { ...north, yaw: Math.PI / 2 };
    const point = floorPoint(east, 240, 269, frame.width, frame.height, projection)!;

    expect(point.x).toBeGreaterThan(east.x);
    expect(point.y).toBeCloseTo(east.z, 0);
  });
});

describe('skyRepeats / skyColumn', () => {
  it('repeats a whole number of times, at least once', () => {
    expect(Number.isInteger(skyRepeats(2048, 640))).toBe(true);
    expect(skyRepeats(2048, 640)).toBeGreaterThanOrEqual(1);
    expect(skyRepeats(100000, 100)).toBe(1);
    expect(skyRepeats(100, 100)).toBeGreaterThan(skyRepeats(2048, 640));
    expect(skyRepeats(0, 0)).toBe(1);
  });

  it('closes the circle: the same column after a full turn, and slides as the camera turns', () => {
    const repeats = skyRepeats(2048, 640);

    expect(skyColumn(0.3, repeats, 2048)).toBe(skyColumn(0.3 + 2 * Math.PI, repeats, 2048));
    expect(skyColumn(0, repeats, 2048)).not.toBe(skyColumn(0.5, repeats, 2048));
    expect(skyColumn(-0.2, repeats, 2048)).toBeGreaterThanOrEqual(0);
    expect(skyColumn(-0.2, repeats, 2048)).toBeLessThan(2048);
  });
});

describe('projectSprite / columnVisible', () => {
  const frame = { width: 480, height: 270 };
  const projection = projectionOf(frame.width, 90);

  it('centers a figure straight ahead and puts its feet below the horizon', () => {
    const sprite = projectSprite(north, { x: 250, y: 250 }, 40, 80, frame.width, frame.height, projection)!;

    expect(sprite.depth).toBeCloseTo(200);
    expect((sprite.screenX0 + sprite.screenX1) / 2).toBeCloseTo(240);
    expect(sprite.bottom).toBeGreaterThan(135);
    expect(sprite.top).toBeLessThan(sprite.bottom);
    expect(sprite.screenX1 - sprite.screenX0).toBeCloseTo((40 * projection) / 200);
  });

  it('puts a figure to the right of the view on the right of the screen', () => {
    const sprite = projectSprite(north, { x: 350, y: 250 }, 40, 80, frame.width, frame.height, projection)!;

    expect((sprite.screenX0 + sprite.screenX1) / 2).toBeGreaterThan(240);
  });

  it('does not draw what is behind the camera', () => {
    expect(projectSprite(north, { x: 250, y: 600 }, 40, 80, frame.width, frame.height, projection)).toBeNull();
  });

  it('hides a figure behind a wall and shows it in the columns where the wall is farther', () => {
    // A wall 100 units away in columns 0–199, open (Infinity) from 200 on.
    const zBuffer = Array.from({ length: frame.width }, (_, column) => (column < 200 ? 100 : Infinity));

    expect(columnVisible(zBuffer, 50, 300)).toBe(false);
    expect(columnVisible(zBuffer, 300, 300)).toBe(true);
    expect(columnVisible(zBuffer, 50, 50)).toBe(true); // in front of the wall
    expect(columnVisible(zBuffer, -1, 10)).toBe(false);
    expect(columnVisible(zBuffer, 480, 10)).toBe(false);
  });
});
