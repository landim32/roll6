import { useEffect } from 'react';
import { ChatComposer } from './ChatComposer';
import { ChatMessageList } from './ChatMessageList';

/**
 * The campaign chat (041): the whole timeline — conversation and turn records — over the composer. On phones the
 * on-screen keyboard shrinks the visual viewport; its height is exposed as `--stm-keyboard-offset` so the composer
 * stays above it.
 */
export const ChatPanel = () => {
  useEffect(() => {
    const viewport = window.visualViewport;
    if (!viewport) return;
    const root = document.documentElement;
    const update = () => {
      const offset = Math.max(0, window.innerHeight - viewport.height - viewport.offsetTop);
      root.style.setProperty('--stm-keyboard-offset', `${offset}px`);
    };
    update();
    viewport.addEventListener('resize', update);
    viewport.addEventListener('scroll', update);
    return () => {
      viewport.removeEventListener('resize', update);
      viewport.removeEventListener('scroll', update);
      root.style.removeProperty('--stm-keyboard-offset');
    };
  }, []);

  return (
    <section className="stm-chat">
      <ChatMessageList />
      <ChatComposer />
    </section>
  );
};

export default ChatPanel;
