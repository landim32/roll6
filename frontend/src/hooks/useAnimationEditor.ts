import { useContext } from 'react';
import AnimationEditorContext from '../Contexts/AnimationEditorContext';

/** Access the animation editor context (086). Throws if used outside AnimationEditorProvider. */
export const useAnimationEditor = () => {
  const context = useContext(AnimationEditorContext);
  if (!context) throw new Error('useAnimationEditor must be used within an AnimationEditorProvider');
  return context;
};

export default useAnimationEditor;
