/**
 * Quality of the 3D view (053, issue #31; redefined for the 3D scene of 081): the one place that says what each level
 * costs and draws. Lighter to sharper: "Padrão" draws at the screen's own resolution without smoothing, with pixelated
 * figures like the old view; "Alta" smooths the edges and the figures; "Ultra" draws finer still and casts shadows.
 * The walls, the terrain, the movement and the balloons are the same on every level.
 *
 * The choice is remembered on this device only (localStorage `roll6:3d-quality`), never shared with the table nor sent
 * to the API, and cleared on logout like the other screen preferences. Every storage access is guarded: it may be
 * missing or throw (private windows, blocked site data) and the view then just opens in "Padrão".
 */

export const VIEW_QUALITY = {
  /** Resolution 1×, no smoothing, pixelated figures: light on any device. */
  standard: 'standard',
  /** Up to 1.5× the resolution, smooth edges, smooth figures. */
  high: 'high',
  /** Up to 2× the resolution, smooth edges and shadows cast by the light. */
  ultra: 'ultra',
} as const;

export type ViewQuality = (typeof VIEW_QUALITY)[keyof typeof VIEW_QUALITY];

/** The levels from the lightest to the sharpest — the order the chooser lists them in. */
export const QUALITY_ORDER: readonly ViewQuality[] = [VIEW_QUALITY.standard, VIEW_QUALITY.high, VIEW_QUALITY.ultra];

/** How the figures are sampled: the nearest texel (the retro look) or smooth, with reduced copies by distance. */
export type SpriteSampling = 'nearest' | 'smooth';

export interface QualityProfile {
  /** Most device pixels drawn per screen pixel (the screen's own ratio is used up to this). */
  maxPixelRatio: number;
  /** Smooth the edges of the terrain and the models (multisampling). */
  antialias: boolean;
  figureSampling: SpriteSampling;
  /** Sharpness of textures seen at a slant (the floor far away). */
  anisotropy: number;
  /** Size of the light's shadow map; 0 = no cast shadows (the soft spot under each piece stays). */
  shadowMap: number;
  /** Longest side (px) the figures' images are read at. 480 is the size they are saved at. */
  spriteMaxSide: number;
}

/** The only numbers of the levels. */
export const QUALITY_PROFILES: Record<ViewQuality, QualityProfile> = {
  standard: { maxPixelRatio: 1, antialias: false, figureSampling: 'nearest', anisotropy: 1, shadowMap: 0, spriteMaxSide: 256 },
  high: { maxPixelRatio: 1.5, antialias: true, figureSampling: 'smooth', anisotropy: 4, shadowMap: 0, spriteMaxSide: 480 },
  ultra: { maxPixelRatio: 2, antialias: true, figureSampling: 'smooth', anisotropy: 8, shadowMap: 2048, spriteMaxSide: 480 },
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
