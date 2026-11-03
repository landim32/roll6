/** Map paint types (107) — marks and drawings of a campaign map; mirror the backend MapPaintInfo DTOs. */

/**
 * What fills a hex (backend HexMarkKind); constants because `enum` is not allowed. Only `mark` (the red X) takes a
 * text. Marks are informative: no rule of movement or placement reads them.
 */
export const HEX_MARK = {
  wall: 1,
  stone: 2,
  hole: 3,
  water: 4,
  fire: 5,
  entrance: 6,
  mark: 7,
} as const;

export type HexMarkKind = (typeof HEX_MARK)[keyof typeof HEX_MARK];

/** Every kind, in the order the toolbar offers them. */
export const HEX_MARKS: readonly HexMarkKind[] = [
  HEX_MARK.wall, HEX_MARK.stone, HEX_MARK.hole, HEX_MARK.water, HEX_MARK.fire, HEX_MARK.entrance, HEX_MARK.mark,
];

/** i18n key suffix of each kind (`paint.kind.{key}`). */
export const HEX_MARK_KEY: Record<HexMarkKind, string> = {
  [HEX_MARK.wall]: 'wall',
  [HEX_MARK.stone]: 'stone',
  [HEX_MARK.hole]: 'hole',
  [HEX_MARK.water]: 'water',
  [HEX_MARK.fire]: 'fire',
  [HEX_MARK.entrance]: 'entrance',
  [HEX_MARK.mark]: 'mark',
};

/** Free-form drawing kinds (backend DrawingKind). Outlines only. */
export const DRAWING_KIND = {
  rectangle: 1,
  circle: 2,
  pencil: 3,
  line: 4,
  arrow: 5,
} as const;

export type DrawingKind = (typeof DRAWING_KIND)[keyof typeof DRAWING_KIND];

/** Longest mark text (characters). */
export const MAX_MARK_TEXT = 100;
/** Most hexes per `PUT …/hex-marks`. */
export const MAX_MARKS_PER_REQUEST = 200;
/** Most points of a pencil stroke. */
export const MAX_STROKE_POINTS = 2000;
/** Stroke width limits (px), like the image editor's brush. */
export const MIN_PAINT_WIDTH = 1;
export const MAX_PAINT_WIDTH = 200;

/** A point in map pixels: `[x, y]`. */
export type PaintPoint = [number, number];

/** A marked hex (column/row, odd-q). */
export interface MapHexMarkInfo {
  x: number;
  y: number;
  kind: HexMarkKind;
  /** Only for `HEX_MARK.mark`; null = just the X. */
  text: string | null;
}

/** One hex of a batch write; `kind: null` removes the hex's mark. */
export interface MapHexMarkWriteInfo {
  x: number;
  y: number;
  kind: HexMarkKind | null;
  text?: string | null;
}

/** Body of `PUT /api/map/{id}/hex-marks`. */
export interface MapHexMarksInfo {
  marks: MapHexMarkWriteInfo[];
}

/** Body of `POST /api/map/{id}/drawing`. */
export interface MapDrawingInsertInfo {
  kind: DrawingKind;
  /** Rectangle = 2 corners, circle = center + a point on it, line/arrow = start + end, pencil = 2…2000 points. */
  points: PaintPoint[];
  /** `#rrggbb`. */
  color: string;
  /** 1–200 px. */
  width: number;
  /** 0.05–1. */
  opacity: number;
}

/** A stored drawing. */
export interface MapDrawingInfo extends MapDrawingInsertInfo {
  mapDrawingId: number;
  userId: number;
  createdAt: string;
}

/** The paint of a campaign map. Drawings ordered by id (oldest first = bottom). */
export interface MapPaintInfo {
  mapId: number;
  marks: MapHexMarkInfo[];
  drawings: MapDrawingInfo[];
}

/** A hex coordinate. */
export interface HexCoordInfo {
  x: number;
  y: number;
}

/** A change of the paint (write results and the `mapPaint.changed` event data). */
export interface MapPaintChangeInfo {
  mapId?: number;
  marks?: MapHexMarkInfo[] | null;
  removedHexes?: HexCoordInfo[] | null;
  drawing?: MapDrawingInfo | null;
  deletedDrawingId?: number | null;
  cleared?: boolean;
}

/** A piece covering a hex (`GET /api/map/{id}/hex`). */
export interface HexPieceInfo {
  mapTokenId: number;
  name: string;
  tokenType: number;
  campaignCharacterId: number | null;
  characterId: number | null;
  mapNpcId: number | null;
  posture: number | null;
  x: number;
  y: number;
}

/** What is on a hex of a campaign map. */
export interface HexContentInfo {
  mapId: number;
  x: number;
  y: number;
  inside: boolean;
  mark: MapHexMarkInfo | null;
  pieces: HexPieceInfo[];
}

/** Tools of the paint toolbar (107). */
export const PAINT_TOOL = {
  fill: 'fill',
  rect: 'rect',
  circle: 'circle',
  pencil: 'pencil',
  line: 'line',
  arrow: 'arrow',
  erase: 'erase',
} as const;

export type PaintTool = (typeof PAINT_TOOL)[keyof typeof PAINT_TOOL];

/** Drawing kind made by each drawing tool. */
export const TOOL_DRAWING: Partial<Record<PaintTool, DrawingKind>> = {
  [PAINT_TOOL.rect]: DRAWING_KIND.rectangle,
  [PAINT_TOOL.circle]: DRAWING_KIND.circle,
  [PAINT_TOOL.pencil]: DRAWING_KIND.pencil,
  [PAINT_TOOL.line]: DRAWING_KIND.line,
  [PAINT_TOOL.arrow]: DRAWING_KIND.arrow,
};

/** The toolbar's choices, remembered only in memory. */
export interface PaintSettings {
  tool: PaintTool;
  /** Kind of the fill; null = "Nenhum" (the fill erases marks). */
  fillKind: HexMarkKind | null;
  /** Text of a Mark fill (≤ 100). */
  markText: string;
  /** `#rrggbb`. */
  color: string;
  /** 1–200 px. */
  width: number;
  /** 0.05–1. */
  opacity: number;
}

/** Defaults: Parede, red, 4 px, 100 %. */
export const DEFAULT_PAINT_SETTINGS: PaintSettings = {
  tool: PAINT_TOOL.fill,
  fillKind: HEX_MARK.wall,
  markText: '',
  color: '#e03131',
  width: 4,
  opacity: 1,
};
