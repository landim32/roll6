import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { HeartFillIcon, ThumbsUpFillIcon } from '../ui/icons';
import { reactionSummary } from '../../lib/chatItems';
import { REACTION } from '../../types/chat';
import type { ChatReactionInfo } from '../../types/chat';

interface ReactionsBadgeProps {
  reactions: ChatReactionInfo[] | undefined;
  userId: number | null;
}

/** The reactions of an entry (044): the icons present and the total; tapping shows who reacted with what. */
export const ReactionsBadge = ({ reactions, userId }: ReactionsBadgeProps) => {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const summary = reactionSummary(reactions, userId);
  if (summary.total === 0) return null;

  return (
    <span className="stm-chat-reactions-wrap">
      <button type="button" className={`stm-chat-reactions${summary.mine ? ' is-mine' : ''}`}
        onClick={(event) => { event.stopPropagation(); setOpen((o) => !o); }}
        aria-expanded={open} title={t('chat.whoReacted')} aria-label={t('chat.reactionsLabel', { count: summary.total })}>
        {summary.like > 0 && <ThumbsUpFillIcon size={13} className="is-like" />}
        {summary.love > 0 && <HeartFillIcon size={13} className="is-love" />}
        {summary.total > 1 && <span>{summary.total}</span>}
      </button>
      {open && (
        <span className="stm-chat-reactions-list" role="list">
          {(reactions ?? []).map((r) => (
            <span key={r.userId} role="listitem">
              {r.kind === REACTION.love ? <HeartFillIcon size={12} className="is-love" /> : <ThumbsUpFillIcon size={12} className="is-like" />}
              {' '}{r.name}
            </span>
          ))}
        </span>
      )}
    </span>
  );
};

export default ReactionsBadge;
