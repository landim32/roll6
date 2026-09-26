import { useContext } from 'react';
import TokenContext from '../Contexts/TokenContext';

/** Access the Token context. Throws if used outside TokenProvider. */
export const useToken = () => {
  const context = useContext(TokenContext);
  if (!context) throw new Error('useToken must be used within a TokenProvider');
  return context;
};

export default useToken;
