import type { ListQuery } from './common';
import type { AnimationFile } from '../lib/animationFormat';

/** Library animation types (059): what the animation shows. Only three feed a token's states for now (Q2). */
export const ANIMATION_TYPE = {
  idle: 1,
  walk: 2,
  run: 3,
  crouch: 4,
  defeated: 5,
  attack: 6,
  defend: 7,
} as const;

export type AnimationType = (typeof ANIMATION_TYPE)[keyof typeof ANIMATION_TYPE];

export const ANIMATION_TYPES: readonly AnimationType[] = [1, 2, 3, 4, 5, 6, 7];

/** A library animation (`GET /api/animation`). */
export interface AnimationInfo {
  animationId: number;
  userId: number;
  ownerName: string | null;
  name: string;
  type: AnimationType;
  duration: number;
  loop: boolean;
  /** `/api/animation/{id}/file`: the file is read through the API, never the bucket. */
  fileUrl: string;
  createdAt: string;
  updatedAt: string;
}

/** Uploads an animation: its name, its type and the `roll6-animation` file itself. */
export interface AnimationInsertInfo {
  name: string;
  type: AnimationType;
  content: AnimationFile;
}

/** Renames or retypes an animation (its owner only). */
export interface AnimationUpdateInfo {
  name: string;
  type: AnimationType;
}

export interface AnimationQuery extends ListQuery {
  type?: AnimationType;
}
