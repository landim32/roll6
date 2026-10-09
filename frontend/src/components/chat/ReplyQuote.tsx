import { useTranslation } from 'react-i18next';
import { chatLabel, nameColor } from '../../lib/chatItems';
import type { ChatReplyInfo } from '../../types/chat';

interface ReplyQuoteProps {
  reply: ChatReplyInfo;
  /** Inside a bubble: tapping goes to the original. In the composer it only shows what is being answered. */
  onOpen?: (key: string) => void;
}

/** The quoted entry of a reply (044): the author in their color and the start of what they said. */
export const ReplyQuote = ({ reply, onOpen }: ReplyQuoteProps) => {
  const { t } = useTranslation();
  const color = nameColor(reply.displayName || '?');
  const body = reply.deleted ? t('chat.deleted') : reply.cancelled ? `${t('chat.actionCancelled')} — ${reply.excerpt}` : reply.excerpt;
  const content = (
    <>
      <span className="stm-chat-quote-name" style={{ color }}>{reply.deleted ? '' : chatLabel(reply.displayName)}</span>
      <span className="stm-chat-quote-text">{body}</span>
    </>
  );
  if (!onOpen) return <div className="stm-chat-quote" style={{ borderColor: color }}>{content}</div>;
  return (
    <button type="button" className="stm-chat-quote" style={{ borderColor: color }}
      onClick={(event) => { event.stopPropagation(); onOpen(reply.key); }}
      title={t('chat.goToOriginal')} aria-label={t('chat.goToOriginal')}>
      {content}
    </button>
  );
};

export default ReplyQuote;
