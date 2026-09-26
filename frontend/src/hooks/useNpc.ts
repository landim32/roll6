import { useContext } from 'react';
import NpcContext from '../Contexts/NpcContext';

/** Access the Npc context. Throws if used outside NpcProvider. */
export const useNpc = () => {
  const context = useContext(NpcContext);
  if (!context) throw new Error('useNpc must be used within a NpcProvider');
  return context;
};

export default useNpc;
