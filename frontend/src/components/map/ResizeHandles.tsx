import { useRef } from 'react';
import type { PointerEvent as ReactPointerEvent } from 'react';
import type { ImageLayout } from '../../Contexts/MapEditorContext';

interface ResizeHandlesProps {
  layout: ImageLayout;
  zoom: number;
  onChange: (layout: ImageLayout) => void;
}

interface DragState {
  mode: 'move' | 'resize';
  startX: number;
  startY: number;
  start: ImageLayout;
}

const HANDLE_SCREEN_SIZE = 14;

/**
 * Resize mode: drag the image to change left/top, drag the bottom-right corner to change
 * width/height (keeps the aspect ratio; hold Shift to change it). Pointer deltas are divided by
 * the zoom so values stay in map units.
 */
export const ResizeHandles = ({ layout, zoom, onChange }: ResizeHandlesProps) => {
  const drag = useRef<DragState | null>(null);

  const begin = (mode: DragState['mode']) => (event: ReactPointerEvent<SVGElement>) => {
    event.stopPropagation();
    event.currentTarget.setPointerCapture(event.pointerId);
    drag.current = { mode, startX: event.clientX, startY: event.clientY, start: layout };
  };

  const move = (event: ReactPointerEvent<SVGElement>) => {
    const state = drag.current;
    if (!state) return;
    event.stopPropagation();
    const dx = (event.clientX - state.startX) / zoom;
    const dy = (event.clientY - state.startY) / zoom;
    const { start } = state;
    if (state.mode === 'move') {
      // The image is drawn at (−left, −top): moving it right lowers left (it may go negative).
      onChange({ ...start, left: start.left - dx, top: start.top - dy });
      return;
    }
    const width = Math.max(16, start.width + dx);
    const height = event.shiftKey ? Math.max(16, start.height + dy) : width * (start.height / start.width);
    onChange({ ...start, width, height });
  };

  const end = (event: ReactPointerEvent<SVGElement>) => {
    if (!drag.current) return;
    event.stopPropagation();
    event.currentTarget.releasePointerCapture(event.pointerId);
    drag.current = null;
  };

  const handleSize = HANDLE_SCREEN_SIZE / zoom;
  const x = -layout.left;
  const y = -layout.top;

  return (
    <g>
      <rect
        className="stm-resize-frame"
        x={x}
        y={y}
        width={layout.width}
        height={layout.height}
        onPointerDown={begin('move')}
        onPointerMove={move}
        onPointerUp={end}
        onPointerCancel={end}
      />
      <rect
        className="stm-resize-handle"
        x={x + layout.width - handleSize / 2}
        y={y + layout.height - handleSize / 2}
        width={handleSize}
        height={handleSize}
        onPointerDown={begin('resize')}
        onPointerMove={move}
        onPointerUp={end}
        onPointerCancel={end}
      />
    </g>
  );
};

export default ResizeHandles;
