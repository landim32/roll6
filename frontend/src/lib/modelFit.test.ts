import { describe, expect, it } from 'vitest';
import { Box3, Euler, Matrix4, Quaternion, Vector3 } from 'three';
import { figureHeight, fitLyingModel, fitModel, LYING_TILT, rotationForYaw } from './modelFit';
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

describe('fitLyingModel (058)', () => {
  const BODY: ModelBounds = { min: [-0.4, 0, -0.25], max: [0.4, 1.8, 0.35] };
  const WIDTH = pieceGeometry(2, HEX_SIZE).box.width;

  /** The eight corners of the bounds placed by three.js with the returned scale, turns (order "YXZ") and position. */
  const placed = (yaw: number, center = { x: 300, y: 200 }) => {
    const fit = fitLyingModel(BODY, WIDTH, center, yaw);
    const matrix = new Matrix4().compose(
      new Vector3(fit.position.x, fit.position.y, fit.position.z),
      new Quaternion().setFromEuler(new Euler(fit.tilt, fit.rotationY, 0, 'YXZ')),
      new Vector3(fit.scale, fit.scale, fit.scale),
    );
    const corners: Vector3[] = [];
    for (const x of [BODY.min[0], BODY.max[0]]) for (const y of [BODY.min[1], BODY.max[1]]) for (const z of [BODY.min[2], BODY.max[2]]) {
      corners.push(new Vector3(x, y, z).applyMatrix4(matrix));
    }
    return { fit, box: new Box3().setFromPoints(corners) };
  };

  it('keeps the standing scale: the same character, lying', () => {
    expect(fitLyingModel(BODY, WIDTH, { x: 0, y: 0 }, 0).scale).toBeCloseTo(fitModel(BODY, WIDTH, { x: 0, y: 0 }, 0).scale);
    expect(fitLyingModel(BODY, WIDTH, { x: 0, y: 0 }, 0).tilt).toBe(LYING_TILT);
  });

  for (const look of [0, 1, 3, 5]) {
    it(`lies on the floor, centered on the piece (look ${look})`, () => {
      const { fit, box } = placed(lookToYaw(look));
      expect(box.min.y).toBeCloseTo(0, 6);
      // As tall as the body is deep, as long as it is tall.
      expect(box.max.y).toBeCloseTo(0.6 * fit.scale, 6);
      expect((box.min.x + box.max.x) / 2).toBeCloseTo(300, 6);
      expect((box.min.z + box.max.z) / 2).toBeCloseTo(200, 6);
    });
  }

  it('lies along the facing, the feet ahead and the head behind', () => {
    const fit = fitLyingModel(BODY, WIDTH, { x: 0, y: 0 }, lookToYaw(0));
    const rotation = new Quaternion().setFromEuler(new Euler(fit.tilt, fit.rotationY, 0, 'YXZ'));
    // Look 0 is north, the top of the map: −z in the 3D view. The head (+Y of the file) ends to the south.
    const head = new Vector3(0, 1, 0).applyQuaternion(rotation);
    expect(head.z).toBeCloseTo(1, 6);
    expect(head.y).toBeCloseTo(0, 6);
  });
});

describe('model size (063)', () => {
  const width = pieceGeometry(1, HEX_SIZE).box.width;
  const center = { x: 300, y: 200 };

  it('is the automatic fit with size 1', () => {
    expect(fitModel(ORC, width, center, 0.7, 1)).toEqual(fitModel(ORC, width, center, 0.7));
    expect(fitLyingModel(ORC, width, center, 0.7, 1)).toEqual(fitLyingModel(ORC, width, center, 0.7));
  });

  it('multiplies the height and keeps the feet on the floor, on the center', () => {
    const fit = fitModel(ORC, width, center, 0, 2);
    expect(fit.scale * 0.8975).toBeCloseTo(2 * figureHeight(width), 6);
    expect(fit.position.y).toBeCloseTo(-ORC.min[1] * fit.scale, 6);
    const feet = { x: 0, y: 0, z: 0 };
    const cos = Math.cos(fit.rotationY);
    const sin = Math.sin(fit.rotationY);
    expect(fit.position.x + feet.x * cos + feet.z * sin).toBeCloseTo(center.x, 6);
    expect(fit.position.z - feet.x * sin + feet.z * cos).toBeCloseTo(center.y, 6);
  });

  it('lies with the same size', () => {
    expect(fitLyingModel(ORC, width, center, 0, 1.5).scale).toBeCloseTo(fitModel(ORC, width, center, 0, 1.5).scale, 9);
  });
});
