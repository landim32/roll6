import { useContext } from 'react';
import CharacterContext from '../Contexts/CharacterContext';

/** Access the Character context. Throws if used outside CharacterProvider. */
export const useCharacter = () => {
  const context = useContext(CharacterContext);
  if (!context) throw new Error('useCharacter must be used within a CharacterProvider');
  return context;
};

export default useCharacter;
