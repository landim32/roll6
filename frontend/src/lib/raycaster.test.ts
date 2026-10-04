import { describe, expect, it } from 'vitest';
import {
  buildMaskGrid, castRay, columnAngle, columnVisible, EYE_HEIGHT, floorPoint, isWallAt, perpendicularDistance,
  projectionOf, projectSprite, shade, skyColumn, skyRepeats, WALL_HEIGHT, wallColumn,
} from './raycaster';
import type { CameraPose, MaskGrid } from './raycaster';

/** A mask from rows of text ('#' wall, '.' empty), one pixel per cell, covering `area`. */
const gridFrom = (rows: string[], area = { x: 0, y: 0, width: rows[0].length * 100, height: rows.length * 100 }): MaskGrid => {
  const width = rows[0].length;
  const pixels = new Uint8ClampedArray(width * rows.length * 4);
  rows.forEach((line, y) => [...line].forEach((ch, x) => {
    const i = (y * width + x) * 4;
    const value = ch === '#' ? 0 : 255;
    pixels.set([value, value, value, 255], i);
  }));
  return buildMaskGrid(pixels, width, rows.length, area);
};

const north: CameraPose = { x: 250, z: 450, yaw: 0, attached: false };

describe('buildMaskGrid', () => {
  it('turns dark pixels into walls on a grid that covers the given area', () => {
    const grid = gridFrom(['#.', '.#'], { x: -50, y: 20, width: 400, height: 200 });

    expect(grid).toMatchObject({ cols: 2, rows: 2, originX: -50, originY: 20, cellWidth: 200, cellHeight: 100 });
    expect([...grid.walls]).toEqual([1, 0, 0, 1]);
  });

  it('reduces a big mask to at most 512 cells on its longest side; a cell is wall when most of its pixels are', () => {
    const width = 1024;
    const height = 512;
    const pixels = new Uint8ClampedArray(width * height * 4).fill(255);
    // Wall on the left half of the first 2×2 block of source pixels only → 2 of 4 pixels is not "most".
    for (const [x, y] of [[0, 0], [1, 0], [0, 1]]) pixels.set([0, 0, 0, 255], (y * width + x) * 4);

    const grid = buildMaskGrid(pixels, width, height, { x: 0, y: 0, width, height });

    expect(grid.cols).toBe(512);
    expect(grid.rows).toBe(256);
    expect(grid.walls[0]).toBe(1); // 3 of 4 are wall
    expect(grid.walls[1]).toBe(0);
  });

  it('keeps a small mask at its own size', () => {
    expect(gridFrom(['..', '..']).cols).toBe(2);
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
});

describe('castRay', () => {
  // Cells are 100 × 100; a wall row at y 100–200 (row 1), the camera at (250, 450) looking north.
  const grid = gridFrom(['.....', '#####', '.....', '.....', '.....']);

  it('hits the wall straight ahead at the right distance and side', () => {
    const hit = castRay(grid, 250, 450, 0, 2000);

    expect(hit).not.toBeNull();
    expect(hit!.distance).toBeCloseTo(250); // from y 450 to the wall's south face at y 200
    expect(hit!.x).toBeCloseTo(250);
    expect(hit!.y).toBeCloseTo(200);
    expect(hit!.side).toBe('ns');
  });

  it('sees the same wall from the other side', () => {
    const hit = castRay(grid, 250, 50, Math.PI, 2000);

    expect(hit!.distance).toBeCloseTo(50);
    expect(hit!.y).toBeCloseTo(100);
  });

  it('hits side faces with a diagonal ray', () => {
    const walled = gridFrom(['..#..', '..#..', '..#..', '..#..', '..#..']);
    const hit = castRay(walled, 50, 250, Math.PI / 2, 2000); // facing east

    expect(hit!.distance).toBeCloseTo(150);
    expect(hit!.side).toBe('ew');
  });

  it('returns null when nothing is in range', () => {
    expect(castRay(grid, 250, 450, 0, 200)).toBeNull();
    expect(castRay(grid, 250, 450, Math.PI, 2000)).toBeNull(); // faces south, empty
  });

  it('ignores the cell the ray starts in', () => {
    const hit = castRay(grid, 250, 150, Math.PI, 2000); // standing inside the wall row, looking south

    expect(hit).toBeNull();
  });

  it('lets a ray from outside the mask enter it and hit', () => {
    const hit = castRay(grid, 250, 900, 0, 5000);

    expect(hit!.y).toBeCloseTo(200);
    expect(hit!.distance).toBeCloseTo(700);
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
      const hit = { distance: 300 / Math.cos(offset), x: 0, y: 0, side: 'ns' as const };
      expect(perpendicularDistance(hit, offset)).toBeCloseTo(300);
    }
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
