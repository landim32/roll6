/**
 * Quality of the 3D view (053, issue #31): the one place that says what each level costs and draws. "Padrão" is the
 * view exactly as it was before 053 — the same frame width, the same figure images, the same filter — so whoever never
 * touches the setting sees no change; "Alta" and "Ultra" buy sharper figures with more work for the device.
 *
 * The choice is remembered on this device only (localStorage `roll6:3d-quality`), never shared with the table nor sent
 * to the API, and cleared on logout like the other screen preferences. Every storage access is guarded: it may be
 * missing or throw (private windows, blocked site data) and the view then just opens in "Padrão".
 */

export const VIEW_QUALITY = {
  /** The view of today: frame up to 480 columns, figures read at 256 px, nearest-neighbour. */
  standard: 'standard',
  /** Finer frame, figures at the size they are saved, bilinear with reduced copies by distance. */
  high: 'high',
  /** Alta + the figures drawn on a screen-size layer over the frame. */
  ultra: 'ultra',
} as const;

export type ViewQuality = (typeof VIEW_QUALITY)[keyof typeof VIEW_QUALITY];

/** The levels from the lightest to the sharpest — the order the chooser lists them in. */
export const QUALITY_ORDER: readonly ViewQuality[] = [VIEW_QUALITY.standard, VIEW_QUALITY.high, VIEW_QUALITY.ultra];

/** How the figures are sampled: the nearest texel (the retro look) or bilinear over reduced copies (`lib/mipmap`). */
export type SpriteSampling = 'nearest' | 'smooth';

export interface QualityProfile {
  /** Widest the world frame gets (one ray per column); it is never wider than the screen. */
  columns: number;
  /** Longest side (px) the figures' images are read at. 480 is the size they are saved at — more would only cost memory. */
  spriteMaxSide: number;
  spriteSampling: SpriteSampling;
  /** The figures leave the small frame for a transparent layer the size of the screen, composed over the blown-up frame. */
  figureLayer: boolean;
}

/** The only numbers of the levels. `standard` must stay what `raycastRenderer`/`StoryView` hard-coded before 053. */
export const QUALITY_PROFILES: Record<ViewQuality, QualityProfile> = {
  standard: { columns: 480, spriteMaxSide: 256, spriteSampling: 'nearest', figureLayer: false },
  high: { columns: 720, spriteMaxSide: 480, spriteSampling: 'smooth', figureLayer: false },
  ultra: { columns: 960, spriteMaxSide: 480, spriteSampling: 'smooth', figureLayer: true },
};

export const VIEW_QUALITY_STORAGE_KEY = 'roll6:3d-quality';

export const isViewQuality = (value: unknown): value is ViewQuality =>
  typeof value === 'string' && (QUALITY_ORDER as readonly string[]).includes(value);

/** The level chosen on this device; anything missing, unknown or unreadable is "Padrão". */
export const readViewQuality = (): ViewQuality => {
  try {
    const stored = localStorage.getItem(VIEW_QUALITY_STORAGE_KEY);
    return isViewQuality(stored) ? stored : VIEW_QUALITY.standard;
  } catch {
    return VIEW_QUALITY.standard;
  }
};

export const writeViewQuality = (level: ViewQuality): void => {
  try {
    localStorage.setItem(VIEW_QUALITY_STORAGE_KEY, level);
  } catch {
    // Storage unavailable: the choice lasts this session only.
  }
};

export const clearViewQuality = (): void => {
  try {
    localStorage.removeItem(VIEW_QUALITY_STORAGE_KEY);
  } catch {
    // Nothing to clear.
  }
};
