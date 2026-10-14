import { describe, expect, it } from 'vitest';
import { figureHeight, fitModel, rotationForYaw } from './modelFit';
import type { ModelBounds } from './modelFit';
import { pieceGeometry } from './pieceDrawing';
import { HEX_SIZE } from './hexGrid';
import { lookToYaw } from './storyCamera';

/** The example orc's bounds (055): 1 unit wide, 0.9 tall, feet on y = 0. */
const ORC: ModelBounds = { min: [-0.5, 0, -0.16], max: [0.5, 0.8975, 0.16] };

/** Where a point of the model (its own units) lands in the world. */
const place = (bounds: ModelBounds, width: number, center: { x: number; y: number }, yaw: number, point: [number, number, number]) => {
  const fit = fitModel(bounds, width, center, yaw);
  const [x, y, z] = point.map((v) => v * fit.scale);
  const cos = Math.cos(fit.rotationY);
  const sin = Math.sin(fit.rotationY);
  return { x: fit.position.x + x * cos + z * sin, y: fit.position.y + y, z: fit.position.z - x * sin + z * cos };
};

describe('figureHeight', () => {
  it('is the silhouette of the 3:4 figure as wide as the shape: 64 units for one hex', () => {
    const width = pieceGeometry(1, HEX_SIZE).box.width;
    expect(figureHeight(width)).toBeCloseTo(64, 0);
  });
});

describe('fitModel', () => {
  const width = pieceGeometry(1, HEX_SIZE).box.width;
  const center = { x: 300, y: 200 };

  it('makes any model as tall as the figure, whatever its units', () => {
    const inCentimeters: ModelBounds = { min: [-50, 0, -16], max: [50, 89.75, 16] };
    expect(fitModel(ORC, width, center, 0).scale * 0.8975).toBeCloseTo(figureHeight(width), 6);
    expect(fitModel(inCentimeters, width, center, 0).scale * 89.75).toBeCloseTo(figureHeight(width), 6);
  });

  it('stands the middle of the feet on the center, on the floor, for every look', () => {
    const offCenter: ModelBounds = { min: [0.2, -0.3, 1], max: [1.2, 0.6, 1.4] };
    for (let look = 0; look < 6; look++) {
      const feet = place(offCenter, width, center, lookToYaw(look), [0.7, -0.3, 1.2]);
      expect(feet.x).toBeCloseTo(center.x, 6);
      expect(feet.y).toBeCloseTo(0, 6);
      expect(feet.z).toBeCloseTo(center.y, 6);
    }
  });

  it('points the model\'s +Z where the piece looks: north is up the map, east is right', () => {
    const ahead = (yaw: number) => {
      const feet = place(ORC, width, center, yaw, [0, 0, 0]);
      const nose = place(ORC, width, center, yaw, [0, 0, 1]);
      return { x: Math.round(nose.x - feet.x), z: Math.round(nose.z - feet.z) };
    };
    const unit = fitModel(ORC, width, center, 0).scale;
    expect(ahead(lookToYaw(0))).toEqual({ x: 0, z: Math.round(-unit) });
    expect(ahead(Math.PI / 2)).toEqual({ x: Math.round(unit), z: 0 });
    expect(ahead(Math.PI)).toEqual({ x: 0, z: Math.round(unit) });
  });

  it('is the three.js turn π − yaw', () => {
    expect(rotationForYaw(0)).toBeCloseTo(Math.PI);
    expect(rotationForYaw(Math.PI)).toBeCloseTo(0);
  });
});
