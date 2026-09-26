import { useContext } from 'react';
import MapTokenContext from '../Contexts/MapTokenContext';

/** Access the MapToken context. Throws if used outside MapTokenProvider. */
export const useMapToken = () => {
  const context = useContext(MapTokenContext);
  if (!context) throw new Error('useMapToken must be used within a MapTokenProvider');
  return context;
};

export default useMapToken;
