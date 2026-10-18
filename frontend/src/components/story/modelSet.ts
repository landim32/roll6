import { AnimationMixer, LoopOnce } from 'three';
import type { AnimationAction, Mesh, Object3D, Scene } from 'three';
import type { Point } from '../../lib/hexGrid';
import { fitLyingModel, fitModel } from '../../lib/modelFit';
import { loadAnimations } from '../../lib/animationCache';
import { clipChoiceIds, sameClipChoices } from '../../lib/modelAnimations';
import type { ModelClipChoices } from '../../lib/modelAnimations';
import type { Roll6Clip } from '../../lib/roll6Clips';
import { instantiate, loadModel } from './loadModel';
import type { ModelAsset } from './loadModel';
import { measureSockets } from './socketAnchors';
import { createWeaponSockets, sameSocketWeapons } from './weaponSockets';
import type { WeaponSocketsSync } from './weaponSockets';
import type { SocketWeapons } from '../../types/weapon';

/**
 * The 3D models of the pieces (055–063) inside the 3D scene (081): one clone per piece, standing on the ground under it
 * like the figure it replaces (`lib/modelFit`), with its own animation mixer — idle, walk for a piece someone walks, and
 * since 058 the death played once (or laid on its back without one) for a piece that is down or out of combat. The scene
 * draws them with the terrain and the figures, so the depth buffer hides whatever stands behind something else.
 * Since 082 a model may carry library weapons (`weaponSockets`), hung on the bones of its sockets (083).
 */
export interface ModelSpec {
  id: number;
  url: string;
  /** Width of the piece's shape (px): the model is as tall as the figure of that width. */
  width: number;
  center: Point;
  yaw: number;
  /** Height of the ground the piece stands on (081). */
  ground: number;
  /** The animation chosen for each state on the token (056). */
  clips: ModelClipChoices;
  /** The piece is down or out of combat (058): the model lies at the end of its death. */
  lying: boolean;
  /** Size of the token's model (063) as a factor of its automatic height; missing = 1. */
  scale?: number;
  /** The weapons in the model's sockets (083) with the token's grips; missing = none. */
  weapons?: SocketWeapons;
}

export interface ModelSet {
  setModels: (models: readonly ModelSpec[]) => void;
  /** Moves one model (a character someone walks) without reloading it. */
  setPose: (id: number, center: Point, yaw: number, ground: number) => void;
  setWalking: (id: number, walking: boolean) => void;
  /** Ultra (081): the models cast shadows on the terrain. */
  setShadows: (on: boolean) => void;
  /** Advances the animations; true while any model has one to play. */
  update: (delta: number) => boolean;
  dispose: () => void;
}

interface Drawn {
  spec: ModelSpec;
  asset: ModelAsset | null;
  object: Object3D | null;
  mixer: AnimationMixer | null;
  idle: AnimationAction | null;
  walk: AnimationAction | null;
  /** The death (058): played once, clamped on its last frame. */
  down: AnimationAction | null;
  walking: boolean;
  /** The weapons this model carries (082/083). */
  hands: WeaponSocketsSync;
}

const FADE_SECONDS = 0.25;

export const createModelSet = (
  scene: Scene,
  events: { onReady: (id: number) => void; onFailed: (id: number) => void; onChange: () => void },
): ModelSet => {
  const drawn = new Map<number, Drawn>();
  /** Library animations (059) read for this view: id → clip, null when it could not be read. */
  const library = new Map<number, Roll6Clip | null>();
  let shadows = false;
  let disposed = false;

  const castShadows = (object: Object3D) => {
    object.traverse((node) => {
      if ((node as Mesh).isMesh) node.castShadow = shadows;
    });
  };

  const place = (entry: Drawn) => {
    if (!entry.object || !entry.asset) return;
    const { bounds } = entry.asset;
    const { width, center, yaw, ground, scale = 1 } = entry.spec;
    // Lying without a death animation (058): the whole model laid on its back. With one, it stands where it falls.
    const lying = entry.spec.lying && !entry.down ? fitLyingModel(bounds, width, center, yaw, scale) : null;
    const fit = lying ?? fitModel(bounds, width, center, yaw, scale);
    entry.object.scale.setScalar(fit.scale);
    entry.object.position.set(fit.position.x, fit.position.y + ground, fit.position.z);
    entry.object.rotation.set(lying?.tilt ?? 0, fit.rotationY, 0, 'YXZ');
    events.onChange();
  };

  /** The model's height in its own units: the unit the weapons' grips are measured in (082). */
  const heightOf = (asset: ModelAsset) => asset.bounds.max[1] - asset.bounds.min[1];

  const holdWeapons = (entry: Drawn) => {
    if (entry.object && entry.asset) entry.hands.sync(entry.object, heightOf(entry.asset), entry.spec.weapons);
  };

  const newHands = () => createWeaponSockets((model) => {
    castShadows(model);
    events.onChange();
  });

  const remove = (entry: Drawn) => {
    entry.hands.reset();
    entry.mixer?.stopAllAction();
    if (entry.object) scene.remove(entry.object);
  };

  /**
   * Builds the actions for the entry's choices and plays the state it is in. Lying (058): `fall` plays the death once
   * from the start (the piece fell while on screen); otherwise it shows its last frame at once (FR-011).
   */
  const animate = (entry: Drawn, fall = false) => {
    if (!entry.asset || !entry.mixer) return;
    entry.mixer.stopAllAction();
    const built = entry.asset.clips(entry.spec.clips, library);
    entry.idle = built.idle ? entry.mixer.clipAction(built.idle) : null;
    entry.walk = built.walk ? entry.mixer.clipAction(built.walk) : null;
    entry.down = built.down ? entry.mixer.clipAction(built.down) : null;
    if (entry.down) {
      entry.down.setLoop(LoopOnce, 1);
      entry.down.clampWhenFinished = true;
    }
    if (entry.spec.lying) {
      if (entry.down) {
        entry.down.reset().play();
        if (!fall) {
          entry.down.time = entry.down.getClip().duration;
          entry.mixer.update(0);
        }
      }
    } else {
      (entry.walking && entry.walk ? entry.walk : entry.idle)?.reset().play();
    }
    events.onChange();
  };

  /**
   * Library animations (059) the entry's choices name are read once (`lib/animationCache`); until they arrive the
   * states play their automatic animation, then every model using them is animated again (a lying one at its last frame).
   */
  const requestLibrary = (entry: Drawn) => {
    const missing = clipChoiceIds(entry.spec.clips).filter((id) => !library.has(id));
    if (missing.length === 0) return;
    void loadAnimations(missing).then((clips) => {
      if (disposed) return;
      for (const [id, clip] of clips) library.set(id, clip);
      for (const other of drawn.values()) {
        if (other.asset && clipChoiceIds(other.spec.clips).some((id) => clips.has(id))) animate(other);
      }
    });
  };

  const load = (entry: Drawn) => {
    const url = entry.spec.url;
    loadModel(url).then((asset) => {
      if (disposed || drawn.get(entry.spec.id) !== entry || entry.spec.url !== url) return;
      const object = instantiate(asset);
      // The sockets are measured on the rest pose, before the mixer moves a bone (083).
      measureSockets(object);
      entry.asset = asset;
      entry.object = object;
      entry.mixer = new AnimationMixer(object);
      castShadows(object);
      animate(entry);
      requestLibrary(entry);
      scene.add(object);
      place(entry);
      holdWeapons(entry);
      events.onReady(entry.spec.id);
    }).catch(() => {
      if (!disposed && drawn.get(entry.spec.id) === entry) events.onFailed(entry.spec.id);
    });
  };

  return {
    setModels: (models) => {
      const wanted = new Set(models.map((model) => model.id));
      for (const [id, entry] of drawn) {
        if (!wanted.has(id)) {
          remove(entry);
          drawn.delete(id);
        }
      }
      for (const spec of models) {
        const entry = drawn.get(spec.id);
        if (!entry || entry.spec.url !== spec.url) {
          if (entry) remove(entry);
          const fresh: Drawn = {
            spec, asset: null, object: null, mixer: null, idle: null, walk: null, down: null, walking: entry?.walking ?? false,
            hands: newHands(),
          };
          drawn.set(spec.id, fresh);
          load(fresh);
        } else {
          const changed = !sameClipChoices(entry.spec.clips, spec.clips);
          // Down ↔ out of combat is still lying: nothing plays again (058). Standing → lying plays the fall.
          const fell = !entry.spec.lying && spec.lying;
          const rose = entry.spec.lying && !spec.lying;
          const armed = !sameSocketWeapons(entry.spec.weapons, spec.weapons);
          entry.spec = spec;
          if (armed) holdWeapons(entry);
          if (changed || fell || rose) animate(entry, fell);
          if (changed) requestLibrary(entry);
          place(entry);
        }
      }
      events.onChange();
    },
    setPose: (id, center, yaw, ground) => {
      const entry = drawn.get(id);
      if (!entry) return;
      entry.spec = { ...entry.spec, center, yaw, ground };
      place(entry);
    },
    setWalking: (id, walking) => {
      const entry = drawn.get(id);
      if (!entry || entry.walking === walking) return;
      entry.walking = walking;
      // A piece lying down never walks (the walker refuses it): its death stays as it is.
      if (entry.spec.lying) return;
      const to = walking ? entry.walk : entry.idle;
      const from = walking ? entry.idle : entry.walk;
      if (to && from) {
        to.reset().play();
        from.crossFadeTo(to, FADE_SECONDS, false);
      } else if (to) {
        to.reset().fadeIn(FADE_SECONDS).play();
      } else if (from) {
        from.fadeOut(FADE_SECONDS);
      }
    },
    setShadows: (on) => {
      shadows = on;
      for (const entry of drawn.values()) if (entry.object) castShadows(entry.object);
    },
    update: (delta) => {
      let animating = false;
      for (const entry of drawn.values()) {
        if (entry.mixer && (entry.idle || entry.walk || entry.down)) {
          entry.mixer.update(delta);
          animating = true;
        }
      }
      return animating;
    },
    dispose: () => {
      disposed = true;
      for (const entry of drawn.values()) remove(entry);
      drawn.clear();
    },
  };
};
