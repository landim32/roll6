import { useContext } from 'react';
import MapEditorContext from '../Contexts/MapEditorContext';

/** Access the MapEditor context. Throws if used outside MapEditorProvider. */
export const useMapEditor = () => {
  const context = useContext(MapEditorContext);
  if (!context) throw new Error('useMapEditor must be used within a MapEditorProvider');
  return context;
};

export default useMapEditor;
