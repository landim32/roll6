import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { ReplyIcon } from '../ui/icons';
import { useLongPress } from '../../hooks/useLongPress';
import { useSwipeReply } from '../../hooks/useSwipeReply';
import { SWIPE_REPLY } from '../../lib/chatGestures';

interface ChatBubbleGesturesProps {
  className: string;
  /** Hold / right click: opens the action bar over this element. */
  onActions: (element: HTMLElement) => void;
  /** Drag to the right (touch): answer this entry. */
  onReply?: () => void;
  children: ReactNode;
  title?: string;
}

/**
 * The row of a chat entry with its gestures (044): hold or right click opens the action bar, and on touch screens a
 * drag to the right starts a reply — the row follows the finger and the reply icon fades in behind it.
 */
export const ChatBubbleGestures = ({ className, onActions, onReply, children, title }: ChatBubbleGesturesProps) => {
  const { t } = useTranslation();
  const press = useLongPress(onActions);
  const swipe = useSwipeReply(() => onReply?.(), onReply !== undefined);

  return (
    <div
      className={`${className} stm-chat-gestures`}
      title={title}
      tabIndex={0}
      aria-label={t('chat.actionsHint')}
      style={swipe.offset ? { transform: `translateX(${swipe.offset}px)` } : undefined}
      onPointerDown={(e) => { press.onPointerDown(e); swipe.onPointerDown(e); }}
      onPointerMove={(e) => { press.onPointerMove(e); swipe.onPointerMove(e); }}
      onPointerUp={(e) => { press.onPointerUp(); swipe.onPointerUp(e); }}
      onPointerCancel={() => { press.onPointerCancel(); swipe.onPointerCancel(); }}
      onPointerLeave={() => press.onPointerLeave()}
      onContextMenu={press.onContextMenu}
      onKeyDown={press.onKeyDown}
      onClickCapture={press.onClickCapture}
    >
      {swipe.offset > 0 && (
        <span className="stm-chat-swipe-icon" style={{ opacity: Math.min(1, swipe.offset / SWIPE_REPLY) }} aria-hidden="true">
          <ReplyIcon size={18} />
        </span>
      )}
      {children}
    </div>
  );
};

export default ChatBubbleGestures;
