import { describe, expect, it } from 'vitest';
import { PerspectiveCamera, Vector3 } from 'three';
import { cameraSetup, projectPoint, verticalFov } from './modelCamera';
import { projectionOf, projectSprite } from './raycaster';
import type { CameraPose } from './raycaster';

const POSES: CameraPose[] = [
  { x: 250, z: 450, yaw: 0, attached: false },
  { x: 100, z: 300, yaw: Math.PI / 2, attached: false },
  { x: 410, z: 120, yaw: 2.3, attached: true },
];
const FRAMES = [{ width: 480, height: 270 }, { width: 720, height: 540 }, { width: 64, height: 40 }];
const FOVS = [70, 30, 90];

/** Pixel of a world point through a three.js camera set up from `cameraSetup`. */
const throughThree = (pose: CameraPose, fov: number, width: number, height: number, point: Vector3) => {
  const setup = cameraSetup(pose, fov, width / height);
  const camera = new PerspectiveCamera(setup.verticalFov, width / height, setup.near, 100000);
  camera.position.set(setup.position.x, setup.position.y, setup.position.z);
  camera.lookAt(setup.target.x, setup.target.y, setup.target.z);
  camera.updateMatrixWorld(true);
  const ndc = point.clone().project(camera);
  return { x: ((ndc.x + 1) / 2) * width, y: ((1 - ndc.y) / 2) * height };
};

describe('verticalFov', () => {
  it('is the horizontal field of view on a square frame and narrower on a wide one', () => {
    expect(verticalFov(70, 1)).toBeCloseTo(70, 6);
    expect(verticalFov(90, 16 / 9)).toBeCloseTo(58.7, 1);
  });
});

describe('the camera of the models matches the raycaster (055)', () => {
  it('puts the feet and the top of a figure on the rows and columns projectSprite gives', () => {
    for (const pose of POSES) {
      for (const { width, height } of FRAMES) {
        for (const fov of FOVS) {
          const ahead = { x: pose.x + Math.sin(pose.yaw) * 200 + Math.cos(pose.yaw) * 30, y: pose.z - Math.cos(pose.yaw) * 200 + Math.sin(pose.yaw) * 30 };
          const sprite = projectSprite(pose, ahead, 60, 80, width, height, projectionOf(width, fov))!;
          const feet = projectPoint(pose, fov, width, height, { x: ahead.x, y: 0, z: ahead.y })!;
          const head = projectPoint(pose, fov, width, height, { x: ahead.x, y: 80, z: ahead.y })!;
          expect(feet.x).toBeCloseTo((sprite.screenX0 + sprite.screenX1) / 2, 6);
          expect(feet.y).toBeCloseTo(sprite.bottom, 6);
          expect(head.y).toBeCloseTo(sprite.top, 6);
          expect(feet.depth).toBeCloseTo(sprite.depth, 6);
        }
      }
    }
  });

  it('three.js, set up from cameraSetup, lands every point on the same pixel', () => {
    for (const pose of POSES) {
      for (const { width, height } of FRAMES) {
        for (const fov of FOVS) {
          for (const [ax, ay, up] of [[200, 30, 0], [150, -40, 64], [300, 10, 120], [90, 0, 10]]) {
            const point = new Vector3(
              pose.x + Math.sin(pose.yaw) * ax + Math.cos(pose.yaw) * ay,
              up,
              pose.z - Math.cos(pose.yaw) * ax + Math.sin(pose.yaw) * ay,
            );
            const ours = projectPoint(pose, fov, width, height, { x: point.x, y: point.y, z: point.z })!;
            const theirs = throughThree(pose, fov, width, height, point);
            expect(theirs.x).toBeCloseTo(ours.x, 3);
            expect(theirs.y).toBeCloseTo(ours.y, 3);
          }
        }
      }
    }
  });

  it('sees nothing behind the camera', () => {
    expect(projectPoint(POSES[0], 70, 480, 270, { x: 250, y: 0, z: 600 })).toBeNull();
  });
});
