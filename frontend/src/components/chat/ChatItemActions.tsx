import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useTranslation } from 'react-i18next';
import {
  ChatLeftTextIcon, HeartFillIcon, HeartIcon, LightningIcon, ReplyIcon, ThumbsUpFillIcon, ThumbsUpIcon, TrashIcon,
} from '../ui/icons';
import { reactionSummary } from '../../lib/chatItems';
import { REACTION } from '../../types/chat';
import type { ChatItemInfo, ReactionKind } from '../../types/chat';

export interface ChatItemActionsProps {
  item: ChatItemInfo;
  /** The bubble the bar floats over. */
  anchor: HTMLElement;
  userId: number | null;
  onReact: (kind: ReactionKind) => void;
  onReply: () => void;
  onConvert: (to: 'action' | 'message') => void;
  onDelete: () => void;
  onClose: () => void;
}

const BAR_HEIGHT = 56;

/**
 * The bar that opens on holding a bubble (044): up to five big buttons — Curtir, Amei, Responder, Ação/Mensagem and
 * Apagar — only those this viewer may use on this entry. It floats above the bubble (below when there is no room) and
 * closes on a tap outside, a scroll or Esc.
 */
export const ChatItemActions = ({ item, anchor, userId, onReact, onReply, onConvert, onDelete, onClose }: ChatItemActionsProps) => {
  const { t } = useTranslation();
  const bar = useRef<HTMLDivElement>(null);
  const [position, setPosition] = useState<{ top: number; left: number } | null>(null);
  const mine = reactionSummary(item.reactions, userId).mine;

  useLayoutEffect(() => {
    const rect = anchor.getBoundingClientRect();
    const width = bar.current?.offsetWidth ?? 280;
    const top = rect.top - BAR_HEIGHT - 8 >= 8 ? rect.top - BAR_HEIGHT - 8 : Math.min(rect.bottom + 8, window.innerHeight - BAR_HEIGHT - 8);
    const left = Math.min(Math.max(8, rect.left + rect.width / 2 - width / 2), window.innerWidth - width - 8);
    setPosition({ top, left });
    bar.current?.querySelector('button')?.focus();
  }, [anchor]);

  useEffect(() => {
    const onPointerDown = (event: PointerEvent) => {
      if (bar.current && !bar.current.contains(event.target as Node)) onClose();
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    const onScroll = () => onClose();
    document.addEventListener('pointerdown', onPointerDown, true);
    document.addEventListener('keydown', onKey);
    window.addEventListener('scroll', onScroll, true);
    return () => {
      document.removeEventListener('pointerdown', onPointerDown, true);
      document.removeEventListener('keydown', onKey);
      window.removeEventListener('scroll', onScroll, true);
    };
  }, [onClose]);

  const act = (fn: () => void) => () => {
    onClose();
    fn();
  };

  return createPortal(
    <div ref={bar} className="stm-chat-actions" role="toolbar" aria-label={t('chat.actionsLabel')}
      style={position ? { top: position.top, left: position.left } : { visibility: 'hidden' }}>
      {item.canReact && (
        <>
          <button type="button" className={`stm-chat-action${mine === REACTION.like ? ' is-on' : ''}`}
            onClick={act(() => onReact(REACTION.like))} title={t('chat.like')} aria-label={t('chat.like')} aria-pressed={mine === REACTION.like}>
            {mine === REACTION.like ? <ThumbsUpFillIcon size={24} /> : <ThumbsUpIcon size={24} />}
          </button>
          <button type="button" className={`stm-chat-action is-love${mine === REACTION.love ? ' is-on' : ''}`}
            onClick={act(() => onReact(REACTION.love))} title={t('chat.love')} aria-label={t('chat.love')} aria-pressed={mine === REACTION.love}>
            {mine === REACTION.love ? <HeartFillIcon size={24} /> : <HeartIcon size={24} />}
          </button>
        </>
      )}
      {item.canReply && (
        <button type="button" className="stm-chat-action" onClick={act(onReply)} title={t('chat.reply')} aria-label={t('chat.reply')}>
          <ReplyIcon size={24} />
        </button>
      )}
      {item.canConvert === 'action' && (
        <button type="button" className="stm-chat-action is-act" onClick={act(() => onConvert('action'))}
          title={t('chat.toAction')} aria-label={t('chat.toAction')}>
          <LightningIcon size={24} />
        </button>
      )}
      {item.canConvert === 'message' && (
        <button type="button" className="stm-chat-action" onClick={act(() => onConvert('message'))}
          title={t('chat.toMessage')} aria-label={t('chat.toMessage')}>
          <ChatLeftTextIcon size={24} />
        </button>
      )}
      {item.canDelete && (
        <button type="button" className="stm-chat-action is-danger" onClick={act(onDelete)} title={t('chat.delete')} aria-label={t('chat.delete')}>
          <TrashIcon size={24} />
        </button>
      )}
    </div>,
    document.body,
  );
};

export default ChatItemActions;
