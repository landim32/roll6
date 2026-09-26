import { useCallback } from 'react';
import { useMapEditor } from './useMapEditor';
import { isInsideGrid, pixelToHex } from '../lib/hexGrid';
import type { Offset, Point } from '../lib/hexGrid';

interface View {
  zoom: number;
  panX: number;
  panY: number;
}

/**
 * Screen point → map point: undo the `translate(pan) scale(zoom)` of the map group, relative to the
 * top-left corner of the SVG.
 */
export const toMapPoint = (clientX: number, clientY: number, svgRect: { left: number; top: number }, view: View): Point => ({
  x: (clientX - svgRect.left - view.panX) / view.zoom,
  y: (clientY - svgRect.top - view.panY) / view.zoom,
});

/** Hex under a pointer/drag event on the map SVG, or null outside the grid. */
export const useMapPointer = () => {
  const { draft, hexSize, view } = useMapEditor();

  return useCallback((event: { clientX: number; clientY: number; currentTarget: Element }): Offset | null => {
    const point = toMapPoint(event.clientX, event.clientY, event.currentTarget.getBoundingClientRect(), view);
    const hex = pixelToHex(point, hexSize);
    return isInsideGrid(hex, draft.gridWidth, draft.gridHeight) ? hex : null;
  }, [draft.gridWidth, draft.gridHeight, hexSize, view]);
};

export default useMapPointer;
