import { useRef, useState } from 'react';
import type { PointerEvent as ReactPointerEvent, WheelEvent as ReactWheelEvent } from 'react';
import { useMapEditor } from '../../hooks/useMapEditor';
import { HexGridLayer } from './HexGridLayer';
import { ImageLayer } from './ImageLayer';
import { ResizeHandles } from './ResizeHandles';

/** Full-screen SVG: image + hex grid inside one transformed group; drag the background to pan. */
export const MapCanvas = () => {
  const { draft, hexSize, view, panBy, zoomIn, zoomOut, resizeMode, canEdit, setImageLayout } = useMapEditor();
  const last = useRef<{ x: number; y: number } | null>(null);
  const [panning, setPanning] = useState(false);

  const onPointerDown = (event: ReactPointerEvent<SVGSVGElement>) => {
    if (event.button !== 0) return;
    event.currentTarget.setPointerCapture(event.pointerId);
    last.current = { x: event.clientX, y: event.clientY };
    setPanning(true);
  };

  const onPointerMove = (event: ReactPointerEvent<SVGSVGElement>) => {
    if (!last.current) return;
    panBy(event.clientX - last.current.x, event.clientY - last.current.y);
    last.current = { x: event.clientX, y: event.clientY };
  };

  const stopPan = (event: ReactPointerEvent<SVGSVGElement>) => {
    if (!last.current) return;
    event.currentTarget.releasePointerCapture(event.pointerId);
    last.current = null;
    setPanning(false);
  };

  const onWheel = (event: ReactWheelEvent<SVGSVGElement>) => {
    if (event.deltaY < 0) zoomIn(event.clientX, event.clientY);
    else zoomOut(event.clientX, event.clientY);
  };

  const hasImage = !!draft.imageUrl && !!draft.imageWidth && !!draft.imageHeight;

  return (
    <svg
      className={`stm-map${panning ? ' stm-panning' : ''}`}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={stopPan}
      onPointerCancel={stopPan}
      onWheel={onWheel}
    >
      <g transform={`translate(${view.panX} ${view.panY}) scale(${view.zoom})`}>
        <ImageLayer url={draft.imageUrl} left={draft.imageLeft} top={draft.imageTop} width={draft.imageWidth} height={draft.imageHeight} />
        <HexGridLayer columns={draft.gridWidth} rows={draft.gridHeight} hexSize={hexSize} />
        {resizeMode && canEdit && hasImage && (
          <ResizeHandles
            layout={{ left: draft.imageLeft, top: draft.imageTop, width: draft.imageWidth ?? 1, height: draft.imageHeight ?? 1 }}
            zoom={view.zoom}
            onChange={setImageLayout}
          />
        )}
      </g>
    </svg>
  );
};

export default MapCanvas;
