import { useContext } from 'react';
import UpdateContext from '../Contexts/UpdateContext';

/** Access the Update context (110). Throws if used outside UpdateProvider. */
export const useUpdate = () => {
  const context = useContext(UpdateContext);
  if (!context) throw new Error('useUpdate must be used within an UpdateProvider');
  return context;
};

export default useUpdate;
