import { useContext } from 'react';
import ChatContext from '../Contexts/ChatContext';

/** Access the Chat context. Throws if used outside ChatProvider. */
export const useChat = () => {
  const context = useContext(ChatContext);
  if (!context) throw new Error('useChat must be used within a ChatProvider');
  return context;
};

export default useChat;
