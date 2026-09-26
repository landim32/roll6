import { useContext } from 'react';
import TurnContext from '../Contexts/TurnContext';

/** Access the Turn context. Throws if used outside TurnProvider. */
export const useTurn = () => {
  const context = useContext(TurnContext);
  if (!context) throw new Error('useTurn must be used within a TurnProvider');
  return context;
};

export default useTurn;
