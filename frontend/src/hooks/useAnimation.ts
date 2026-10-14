import { useContext } from 'react';
import AnimationContext from '../Contexts/AnimationContext';

/** Access the Animation context (059). Throws if used outside AnimationProvider. */
export const useAnimation = () => {
  const context = useContext(AnimationContext);
  if (!context) throw new Error('useAnimation must be used within an AnimationProvider');
  return context;
};

export default useAnimation;
