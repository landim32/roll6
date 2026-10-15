import { describe, expect, it } from 'vitest';
import { addSample, remotePose, RENDER_DELAY, STALE_AFTER } from './remoteWalk';
import type { RemoteTrack, WalkSample } from './remoteWalk';

const sample = (at: number, x: number, over: Partial<WalkSample> = {}): WalkSample => ({ x, z: 0, yaw: 0, moving: true, at, ...over });
const track = (...samples: WalkSample[]): RemoteTrack => samples.reduce<RemoteTrack | undefined>((t, s) => addSample(t, s), undefined)!;

describe('addSample', () => {
  it('keeps the newest samples in order', () => {
    const t = track(sample(0, 0), sample(100, 1), sample(200, 2), sample(300, 3), sample(400, 4));
    expect(t.samples.map((s) => s.x)).toEqual([1, 2, 3, 4]);
  });
});

describe('remotePose', () => {
  it('draws in the past, between the samples around that moment', () => {
    const t = track(sample(1000, 0), sample(1100, 10));
    const pose = remotePose(t, 1050 + RENDER_DELAY)!;
    expect(pose.x).toBeCloseTo(5);
    expect(pose.moving).toBe(true);
  });

  it('turns the short way round', () => {
    const t = track(sample(1000, 0, { yaw: 3.0 }), sample(1100, 0, { yaw: -3.0 }));
    const pose = remotePose(t, 1050 + RENDER_DELAY)!;
    // Halfway from 3.0 to −3.0 through π, not through 0.
    expect(Math.abs(pose.yaw)).toBeGreaterThan(3.0);
  });

  it('holds the first sample before it and the newest after it (never guesses ahead)', () => {
    const t = track(sample(1000, 0), sample(1100, 10));
    expect(remotePose(t, 1000)!.x).toBe(0);
    expect(remotePose(t, 1500)!.x).toBe(10);
  });

  it('forgets a walk that stopped sending', () => {
    const t = track(sample(1000, 0), sample(1100, 10, { moving: false }));
    expect(remotePose(t, 1100 + STALE_AFTER)).not.toBeNull();
    expect(remotePose(t, 1101 + STALE_AFTER)).toBeNull();
    expect(remotePose(undefined, 0)).toBeNull();
  });

  it('stops the walk animation with the sample that says so', () => {
    const t = track(sample(1000, 0), sample(1100, 10, { moving: false }));
    expect(remotePose(t, 1100 + RENDER_DELAY)!.moving).toBe(false);
  });
});
