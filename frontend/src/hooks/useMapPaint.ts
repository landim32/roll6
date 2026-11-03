import { useContext } from 'react';
import MapPaintContext from '../Contexts/MapPaintContext';

/** Access the MapPaint context (107). Throws if used outside MapPaintProvider. */
export const useMapPaint = () => {
  const context = useContext(MapPaintContext);
  if (!context) throw new Error('useMapPaint must be used within a MapPaintProvider');
  return context;
};

export default useMapPaint;
