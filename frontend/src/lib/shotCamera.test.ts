import { describe, expect, it } from 'vitest';
import { cameraAngles } from '../components/animations/editor/player';
import { cameraSide } from './printCaption';
import { SHOT_ANGLES, shotCameraPosition, shotTime } from './shotCamera';
import type { ShotView } from '../types/animationEditor';

const TARGET = { x: 0, y: 1, z: 0 };

describe('shotCamera', () => {
  it('places the camera at the angles the stage reads back', () => {
    for (const view of Object.keys(SHOT_ANGLES) as ShotView[]) {
      const position = shotCameraPosition(TARGET, 5, view);
      const read = cameraAngles(position, TARGET);
      const expected = SHOT_ANGLES[view];
      expect(read.elevation).toBeCloseTo(expected.elevation, 6);
      // At 180° atan2 may answer −180: compare the direction, not the sign.
      expect(Math.cos((read.azimuth * Math.PI) / 180)).toBeCloseTo(Math.cos((expected.azimuth * Math.PI) / 180), 6);
      expect(Math.sin((read.azimuth * Math.PI) / 180)).toBeCloseTo(Math.sin((expected.azimuth * Math.PI) / 180), 6);
      expect(Math.hypot(position.x - TARGET.x, position.y - TARGET.y, position.z - TARGET.z)).toBeCloseTo(5, 6);
    }
  });

  it('names the sides like the user prints do', () => {
    const side = (view: ShotView) => cameraSide(SHOT_ANGLES[view].azimuth, SHOT_ANGLES[view].elevation);
    expect(side('front')).toContain('de frente');
    expect(side('back')).toContain('atrás');
    expect(side('right')).toContain('lado direito');
    expect(side('left')).toContain('lado esquerdo');
  });

  it('turns "key" into the key pose and keeps numbers inside the animation', () => {
    expect(shotTime('key', 2, 0.8)).toBe(0.8);
    expect(shotTime(5, 2, 0.8)).toBe(2);
    expect(shotTime(-1, 2, 0.8)).toBe(0);
    expect(shotTime(0.5, 2, 0.8)).toBe(0.5);
  });
});
