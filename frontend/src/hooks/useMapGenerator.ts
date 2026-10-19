import { useContext } from 'react';
import MapGeneratorContext from '../Contexts/MapGeneratorContext';

/** Access the map generator context (095). Throws if used outside MapGeneratorProvider. */
export const useMapGenerator = () => {
  const context = useContext(MapGeneratorContext);
  if (!context) throw new Error('useMapGenerator must be used within a MapGeneratorProvider');
  return context;
};

export default useMapGenerator;
