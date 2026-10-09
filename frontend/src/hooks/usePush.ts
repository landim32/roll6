import { useContext } from 'react';
import PushContext from '../Contexts/PushContext';

/** Access the Push context. Throws if used outside PushProvider. */
export const usePush = () => {
  const context = useContext(PushContext);
  if (!context) throw new Error('usePush must be used within a PushProvider');
  return context;
};

export default usePush;
