/**
 * Drawing another participant's free-mode walk (069). Samples arrive about ten times a second; drawing each one as it
 * comes would make the figure jump, so the view draws `RENDER_DELAY` ms in the past, between the two samples around
 * that moment — smooth, at most a few tenths of a second behind. It never guesses ahead of the newest sample (no
 * overshooting through a wall), and a walk that stops sending is forgotten after `STALE_AFTER` ms: the figure goes back
 * to the piece, whose hex the walker kept writing. Pure, so every rule is unit-tested.
 */

/** How far in the past the remote figures are drawn (ms). */
export const RENDER_DELAY = 100;
/** A walk without a new sample for this long is over (ms). */
export const STALE_AFTER = 1500;
/** Samples kept per walker: enough to interpolate around the render time. */
const KEEP = 4;

export interface WalkSample {
  x: number;
  /** Map y. */
  z: number;
  yaw: number;
  moving: boolean;
  /** When it arrived (ms, this browser's clock). */
  at: number;
}

export interface RemoteTrack {
  samples: WalkSample[];
}

export interface RemotePose {
  x: number;
  z: number;
  yaw: number;
  moving: boolean;
}

/** The track with a new sample at its end (older ones beyond `KEEP` dropped). */
export const addSample = (track: RemoteTrack | undefined, sample: WalkSample): RemoteTrack => {
  const samples = [...(track?.samples ?? []), sample];
  return { samples: samples.slice(-KEEP) };
};

/** The difference b − a of two angles, in (−π, π]: the short way round. */
const angleDelta = (a: number, b: number): number => {
  const turn = 2 * Math.PI;
  const d = (((b - a) % turn) + turn) % turn;
  return d > Math.PI ? d - turn : d;
};

const pose = (sample: WalkSample): RemotePose => ({ x: sample.x, z: sample.z, yaw: sample.yaw, moving: sample.moving });

/** Where to draw the walker at `now`, or null when its walk is over (no sample for `STALE_AFTER`). */
export const remotePose = (track: RemoteTrack | undefined, now: number): RemotePose | null => {
  const samples = track?.samples ?? [];
  if (samples.length === 0) return null;
  const newest = samples[samples.length - 1];
  if (now - newest.at > STALE_AFTER) return null;
  const time = now - RENDER_DELAY;
  if (time <= samples[0].at) return pose(samples[0]);
  if (time >= newest.at) return pose(newest);
  for (let i = samples.length - 1; i > 0; i--) {
    const a = samples[i - 1];
    const b = samples[i];
    if (time < a.at) continue;
    const t = b.at === a.at ? 1 : (time - a.at) / (b.at - a.at);
    return {
      x: a.x + (b.x - a.x) * t,
      z: a.z + (b.z - a.z) * t,
      yaw: a.yaw + angleDelta(a.yaw, b.yaw) * t,
      moving: a.moving,
    };
  }
  return pose(newest);
};
