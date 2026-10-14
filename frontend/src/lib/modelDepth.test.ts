import { describe, expect, it } from 'vitest';
import { PerspectiveCamera, Vector3 } from 'three';
import { depthBufferValue, figureDepthBias } from './modelDepth';

/** The depth-buffer value three.js gives a point `d` units straight ahead of a camera looking down −Z. */
const threeDepth = (d: number, near: number, far: number): number => {
  const camera = new PerspectiveCamera(60, 16 / 9, near, far);
  camera.updateProjectionMatrix();
  const ndc = new Vector3(0, 0, -d).applyMatrix4(camera.projectionMatrix);
  return (ndc.z + 1) / 2;
};

describe('depthBufferValue (057)', () => {
  it('matches three.js\'s projection for near, middle and far points', () => {
    for (const [near, far] of [[4, 100000], [0.1, 100]] as const) {
      for (const d of [near * 1.5, 50, 900, far * 0.5]) {
        expect(depthBufferValue(d, near, far)).toBeCloseTo(threeDepth(d, near, far), 6);
      }
    }
  });

  it('grows with the distance', () => {
    let previous = -Infinity;
    for (const d of [5, 10, 40, 200, 3000, 60000]) {
      const value = depthBufferValue(d, 4, 100000);
      expect(value).toBeGreaterThan(previous);
      previous = value;
    }
  });

  it('pulls a figure a hair toward the camera so a model at the same depth does not flicker against it', () => {
    expect(figureDepthBias(300)).toBeLessThan(300);
    expect(figureDepthBias(300)).toBeGreaterThan(299.9);
  });
});
