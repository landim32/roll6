import { memo, useId } from 'react';
import { hexCenter, hexPath, isInsideGrid } from '../../lib/hexGrid';
import { markSymbolId, markTextLayout } from '../../lib/hexMarkArt';
import { drawingPath, markTextLines } from '../../lib/mapPaint';
import { HEX_MARK } from '../../types/mapPaint';
import type { MapDrawingInsertInfo, MapPaintInfo } from '../../types/mapPaint';
import type { PaintPreview } from '../../hooks/useMapPaintTool';
import { HexMarkSymbols } from './hexMarkArt';

interface PaintLayerProps {
  paint: MapPaintInfo | null;
  hexSize: number;
  columns: number;
  rows: number;
}

const DrawingPath = ({ drawing, className }: { drawing: MapDrawingInsertInfo; className?: string }) => (
  <path
    className={className}
    d={drawingPath(drawing)}
    fill="none"
    stroke={drawing.color}
    strokeWidth={drawing.width}
    strokeOpacity={drawing.opacity}
    strokeLinecap="round"
    strokeLinejoin="round"
  />
);

/**
 * The paint of the campaign map (107): hex marks, then drawings by id (newest on top), between the grid and the
 * pieces. Memoized: it re-renders only when the paint (or the grid) changes, never on piece moves. Marks of hexes
 * outside the grid are not drawn.
 */
export const PaintLayer = memo(({ paint, hexSize, columns, rows }: PaintLayerProps) => {
  const prefix = `stm-mark${useId().replace(/:/g, '')}`;
  if (!paint || (paint.marks.length === 0 && paint.drawings.length === 0)) return null;
  const text = markTextLayout(hexSize);
  return (
    <g className="stm-paint">
      <HexMarkSymbols prefix={prefix} size={hexSize} />
      {paint.marks.filter((mark) => isInsideGrid(mark, columns, rows)).map((mark) => {
        const center = hexCenter(mark.x, mark.y, hexSize);
        const lines = mark.kind === HEX_MARK.mark ? markTextLines(mark.text) : [];
        return (
          <g key={`${mark.x},${mark.y}`}>
            <use href={`#${markSymbolId(prefix, mark.kind, lines.length > 0)}`} x={center.x} y={center.y} />
            {lines.map((line, i) => (
              <text key={i} className="stm-hex-mark-text" x={center.x} y={center.y + text.firstLine + i * text.lineHeight}
                fontSize={text.fontSize} textAnchor="middle">
                {line}
              </text>
            ))}
          </g>
        );
      })}
      {paint.drawings.map((drawing) => <DrawingPath key={drawing.mapDrawingId} drawing={drawing} />)}
    </g>
  );
});

PaintLayer.displayName = 'PaintLayer';

/** The gesture in progress: the hexes of a fill drag and the drawing being made. */
export const PaintPreviewLayer = ({ preview, hexSize }: { preview: PaintPreview | null; hexSize: number }) => {
  if (!preview) return null;
  return (
    <g className="stm-paint-preview">
      {preview.hexes.length > 0 && (
        <path className={`stm-paint-preview-hex${preview.erasing ? ' is-erasing' : ''}`}
          d={preview.hexes.map((hex) => hexPath(hex.x, hex.y, hexSize)).join('')} />
      )}
      {preview.drawing && <DrawingPath drawing={preview.drawing} />}
    </g>
  );
};

export default PaintLayer;
