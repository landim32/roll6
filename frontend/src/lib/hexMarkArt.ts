/**
 * Vector art of each hex mark kind (107), as path data around the hex center (0, 0) for a flat-top hex of `size`
 * (center to corner). One description feeds the SVG layer (`components/map/hexMarkArt`) and the shared JPEG
 * (`lib/mapSnapshot`). Colors are names of the `--stm-mark-*` variables of `styles/theme.css`.
 */
import { HEX_MARK } from '../types/mapPaint';
import type { HexMarkKind } from '../types/mapPaint';

/** One piece of a mark's picture. */
export interface ArtShape {
  d: string;
  /** CSS variable name (`--stm-mark-…`) of the fill, if filled. */
  fill?: string;
  /** CSS variable name of the stroke, if stroked. */
  stroke?: string;
  /** Stroke width in map px. */
  width?: number;
  opacity?: number;
}

const n = (value: number): string => (Math.round(value * 100) / 100).toString();

/** Closed flat-top hexagon of radius `r` around (0, 0). */
const hexagon = (r: number): string =>
  `M${Array.from({ length: 6 }, (_, i) => {
    const angle = (Math.PI / 3) * i;
    return `${n(r * Math.cos(angle))},${n(r * Math.sin(angle))}`;
  }).join('L')}Z`;

const ellipse = (cx: number, cy: number, rx: number, ry: number): string =>
  `M${n(cx - rx)},${n(cy)}A${n(rx)},${n(ry)} 0 1 0 ${n(cx + rx)},${n(cy)}A${n(rx)},${n(ry)} 0 1 0 ${n(cx - rx)},${n(cy)}Z`;

/** An irregular rounded rock: an octagon with uneven radii. */
const rock = (cx: number, cy: number, r: number): string => {
  const factors = [1, 0.85, 0.95, 0.8, 1, 0.9, 0.82, 0.95];
  return `M${factors.map((f, i) => {
    const angle = (Math.PI / 4) * i + 0.2;
    return `${n(cx + r * f * Math.cos(angle))},${n(cy + r * f * 0.8 * Math.sin(angle))}`;
  }).join('L')}Z`;
};

/** Half width of a flat-top hexagon of radius `r` at height `y` (for the wall's courses of bricks). */
const halfWidthAt = (r: number, y: number): number => r - Math.abs(y) / Math.sqrt(3);

const wall = (s: number): ArtShape[] => {
  const r = s * 0.92;
  const top = (Math.sqrt(3) / 2) * r;
  const courses = [-top / 2, 0, top / 2];
  const joints: string[] = [];
  const bands = [-top, -top / 2, 0, top / 2, top];
  for (let i = 0; i < bands.length - 1; i++) {
    const xs = i % 2 === 0 ? [0] : [-s * 0.35, s * 0.35];
    xs.forEach((x) => joints.push(`M${n(x)},${n(bands[i])}L${n(x)},${n(bands[i + 1])}`));
  }
  const lines = courses.map((y) => `M${n(-halfWidthAt(r, y))},${n(y)}L${n(halfWidthAt(r, y))},${n(y)}`);
  return [
    { d: hexagon(r), fill: '--stm-mark-wall', stroke: '--stm-mark-wall-line', width: 2, opacity: 0.92 },
    { d: [...lines, ...joints].join(''), stroke: '--stm-mark-wall-line', width: 2 },
  ];
};

const stone = (s: number): ArtShape[] => [
  { d: rock(-s * 0.3, s * 0.18, s * 0.32), fill: '--stm-mark-stone', stroke: '--stm-mark-stone-line', width: 2 },
  { d: rock(s * 0.32, s * 0.22, s * 0.26), fill: '--stm-mark-stone', stroke: '--stm-mark-stone-line', width: 2 },
  { d: rock(s * 0.02, -s * 0.28, s * 0.3), fill: '--stm-mark-stone', stroke: '--stm-mark-stone-line', width: 2 },
];

/** The whole hex is the hole (like the wall): a dark hexagon with an earthen rim and a darker, deeper middle. */
const hole = (s: number): ArtShape[] => [
  { d: hexagon(s * 0.92), fill: '--stm-mark-hole', stroke: '--stm-mark-hole-rim', width: 4, opacity: 0.95 },
  { d: hexagon(s * 0.62), fill: '--stm-mark-hole', stroke: '--stm-mark-hole-rim', width: 1.5, opacity: 0.9 },
];

const water = (s: number): ArtShape[] => {
  const wave = (y: number) =>
    `M${n(-s * 0.45)},${n(y)}q${n(s * 0.15)},${n(-s * 0.12)} ${n(s * 0.3)},0t${n(s * 0.3)},0t${n(s * 0.3)},0`;
  return [
    { d: hexagon(s * 0.92), fill: '--stm-mark-water', opacity: 0.6 },
    { d: [-s * 0.3, 0, s * 0.3].map(wave).join(''), stroke: '--stm-mark-water-line', width: 2.5 },
  ];
};

const fire = (s: number): ArtShape[] => [
  {
    d: `M0,${n(s * 0.55)}C${n(-s * 0.5)},${n(s * 0.5)} ${n(-s * 0.5)},0 ${n(-s * 0.15)},${n(-s * 0.6)}`
      + `C${n(-s * 0.1)},${n(-s * 0.25)} ${n(s * 0.1)},${n(-s * 0.2)} ${n(s * 0.12)},${n(-s * 0.38)}`
      + `C${n(s * 0.45)},0 ${n(s * 0.5)},${n(s * 0.5)} 0,${n(s * 0.55)}Z`,
    fill: '--stm-mark-fire',
  },
  {
    d: `M0,${n(s * 0.55)}C${n(-s * 0.25)},${n(s * 0.5)} ${n(-s * 0.25)},${n(s * 0.2)} ${n(-s * 0.05)},${n(-s * 0.1)}`
      + `C0,${n(s * 0.1)} ${n(s * 0.1)},${n(s * 0.1)} ${n(s * 0.12)},0`
      + `C${n(s * 0.25)},${n(s * 0.2)} ${n(s * 0.25)},${n(s * 0.5)} 0,${n(s * 0.55)}Z`,
    fill: '--stm-mark-fire-core',
  },
];

const entrance = (s: number): ArtShape[] => [
  {
    d: `M${n(-s * 0.3)},${n(s * 0.6)}L${n(-s * 0.3)},${n(-s * 0.25)}A${n(s * 0.3)},${n(s * 0.3)} 0 0 1 ${n(s * 0.3)},${n(-s * 0.25)}`
      + `L${n(s * 0.3)},${n(s * 0.6)}Z`,
    fill: '--stm-mark-door', stroke: '--stm-mark-door-line', width: 2,
  },
  { d: ellipse(s * 0.15, s * 0.15, s * 0.05, s * 0.05), fill: '--stm-mark-door-line' },
  { d: `M${n(-s * 0.45)},${n(s * 0.6)}L${n(s * 0.45)},${n(s * 0.6)}`, stroke: '--stm-mark-door-line', width: 3 },
];

/** The red X; with a text it is smaller and higher so the text fits under it. */
const markX = (s: number, withText: boolean): ArtShape[] => {
  const half = withText ? s * 0.26 : s * 0.4;
  const cy = withText ? -s * 0.22 : 0;
  return [{
    d: `M${n(-half)},${n(cy - half)}L${n(half)},${n(cy + half)}M${n(half)},${n(cy - half)}L${n(-half)},${n(cy + half)}`,
    stroke: '--stm-mark-x', width: withText ? 5 : 6,
  }];
};

/** The picture of a mark kind for a hex of `size`. */
export const markArt = (kind: HexMarkKind, size: number, withText = false): ArtShape[] => {
  switch (kind) {
    case HEX_MARK.wall: return wall(size);
    case HEX_MARK.stone: return stone(size);
    case HEX_MARK.hole: return hole(size);
    case HEX_MARK.water: return water(size);
    case HEX_MARK.fire: return fire(size);
    case HEX_MARK.entrance: return entrance(size);
    default: return markX(size, withText);
  }
};

/** Mark text layout under the X: first baseline (from the hex center) and line height, in map px. */
export const markTextLayout = (size: number): { firstLine: number; lineHeight: number; fontSize: number } => ({
  firstLine: size * 0.3,
  lineHeight: size * 0.28,
  fontSize: size * 0.26,
});

/** Every color variable the art uses (the snapshot resolves them once). */
export const MARK_COLOR_VARS: readonly string[] = [
  '--stm-mark-wall', '--stm-mark-wall-line', '--stm-mark-stone', '--stm-mark-stone-line', '--stm-mark-hole',
  '--stm-mark-hole-rim', '--stm-mark-water', '--stm-mark-water-line', '--stm-mark-fire', '--stm-mark-fire-core',
  '--stm-mark-door', '--stm-mark-door-line', '--stm-mark-x',
];

/** Id of the SVG symbol of a kind (`withText` = the smaller, raised X of a Mark with text). */
export const markSymbolId = (prefix: string, kind: HexMarkKind, withText: boolean): string =>
  `${prefix}-${kind}${withText ? 't' : ''}`;
