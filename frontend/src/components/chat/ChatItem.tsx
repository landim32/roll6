import { lazy, Suspense, useState } from 'react';
import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { PollCard } from './PollCard';
import { CharacterAvatar } from '../ui/CharacterAvatar';
import {
  Dice1Icon, Dice2Icon, Dice3Icon, Dice4Icon, Dice5Icon, Dice6Icon, HandIndexIcon, LightningIcon, MoveIcon, PencilIcon,
} from '../ui/icons';
import { ChatBubbleGestures } from './ChatBubbleGestures';
import { ReactionsBadge } from './ReactionsBadge';
import { ReplyQuote } from './ReplyQuote';
import { CHAT_KIND } from '../../types/chat';
import type { ChatItemInfo } from '../../types/chat';
import { authorLabel, chatLabel, formatChanges, formatMovement, nameColor, rollTotal, shortName } from '../../lib/chatItems';
import { formatSeconds } from '../../lib/audioFormat';

const MarkdownView = lazy(() => import('../ui/MarkdownView'));

interface ChatItemProps {
  item: ChatItemInfo;
  /** Continues the previous item: no avatar and name again. */
  continued: boolean;
  own: boolean;
  userId: number | null;
  /** Briefly highlighted (the original of a quote just tapped). */
  flash: boolean;
  /** Hold / right click on the bubble (044). */
  onActions: (item: ChatItemInfo, element: HTMLElement) => void;
  /** Drag to the right (044). */
  onReply: (item: ChatItemInfo) => void;
  /** Tap on a quote: go to the original (044). */
  onOpenQuote: (key: string) => void;
  onOpenImage: (url: string, caption: string | null) => void;
}

const timeOf = (iso: string) => {
  // Backend dates are UTC without a zone.
  const date = new Date(/[zZ]|[+-]\d\d:\d\d$/.test(iso) ? iso : `${iso}Z`);
  return date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
};

const Text = ({ value }: { value: string }) => (
  <Suspense fallback={<div className="stm-chat-text">{value}</div>}>
    <div className="stm-chat-text"><MarkdownView value={value} emptyText="" /></div>
  </Suspense>
);

const AudioPlayer = ({ item }: { item: ChatItemInfo }) => {
  const { t } = useTranslation();
  const playable = !item.audioType || document.createElement('audio').canPlayType(item.audioType) !== '';
  if (!item.audioUrl) return null;
  return (
    <div className="stm-chat-audio">
      {playable
        ? <audio controls preload="metadata" src={item.audioUrl} />
        : <span className="text-body-secondary small">{t('chat.audioUnsupported')}</span>}
      {item.audioSeconds !== null && <span className="text-body-secondary small">{formatSeconds(item.audioSeconds)}</span>}
    </div>
  );
};

/** The faces of the dice: `FACES[value - 1]` draws that die. */
const FACES = [Dice1Icon, Dice2Icon, Dice3Icon, Dice4Icon, Dice5Icon, Dice6Icon];

/** A 3d6 roll of the chat: the three faces and the total. */
const RollResult = ({ dice }: { dice: number[] }) => {
  const { t } = useTranslation();
  return (
    <div className="stm-chat-roll" aria-label={t('chat.rollLabel', { dice: dice.join(', '), total: rollTotal(dice) })}>
      <span className="stm-chat-roll-dice" aria-hidden="true">
        {dice.map((value, index) => {
          const Face = FACES[value - 1] ?? Dice1Icon;
          return <Face key={index} size={30} />;
        })}
      </span>
      <span className="stm-chat-roll-total">
        <small>{t('chat.rollTotal')}</small>
        <strong>{rollTotal(dice)}</strong>
      </span>
    </div>
  );
};

/** One entry of the campaign's timeline, drawn by kind (041, research D13; 044: gestures, quotes, reactions). */
export const ChatItem = ({ item, continued, own, userId, flash, onActions, onReply, onOpenQuote, onOpenImage }: ChatItemProps) => {
  const { t } = useTranslation();
  const [imageFailed, setImageFailed] = useState(false);
  const meta = <time className="stm-chat-meta">{timeOf(item.createdAt)}</time>;
  const quote = item.replyTo ? <ReplyQuote reply={item.replyTo} onOpen={onOpenQuote} /> : null;
  const reactions = <ReactionsBadge reactions={item.reactions} userId={userId} />;
  const interactive = !!(item.canReply || item.canReact || item.canDelete || item.canConvert);

  /** A row that answers to holding (action bar) and, when it can be answered, to a drag to the right. */
  const row = (className: string, children: ReactNode, title?: string) => (interactive ? (
    <ChatBubbleGestures className={`${className}${flash ? ' is-flash' : ''}`} title={title}
      onActions={(element) => onActions(item, element)} onReply={item.canReply ? () => onReply(item) : undefined}>
      {children}
    </ChatBubbleGestures>
  ) : <div className={`${className}${flash ? ' is-flash' : ''}`} title={title}>{children}</div>);

  switch (item.kind) {
    case CHAT_KIND.poke:
      return (
        <div className="stm-chat-poke" role="note">
          <HandIndexIcon size={12} /> <span>{item.text}</span> <time className="stm-chat-time">{timeOf(item.createdAt)}</time>
        </div>
      );

    case CHAT_KIND.turnFinished:
      return (
        <div className="stm-chat-divider" role="separator">
          <span>{t('chat.turnFinished', { no: item.turnNo })}</span>
        </div>
      );

    case CHAT_KIND.movement:
    case CHAT_KIND.characterUpdate: {
      // Moves and character changes: smaller gray bubbles of the actor, without actions.
      const isChange = item.kind === CHAT_KIND.characterUpdate;
      return (
        <div className={`stm-chat-message is-movement${own ? ' is-own' : ''}${continued ? ' is-continued' : ''}`} title={item.text ?? undefined}>
          <div className="stm-chat-avatar">
            {!continued && <CharacterAvatar name={chatLabel(item.displayName)} imageUrl={item.displayImageUrl} size={24} />}
          </div>
          <div className="stm-chat-bubble">
            {!continued && (
              <div className="stm-chat-name">
                {chatLabel(item.displayName)}
                {item.authorLabel && <span className="stm-chat-author"> · {authorLabel(item.authorLabel)}</span>}
              </div>
            )}
            <div className="stm-chat-captioned">
              <span className="stm-chat-kind-icon">{isChange ? <PencilIcon size={12} /> : <MoveIcon size={12} />}</span>
              <span className="stm-chat-plain stm-chat-text">{isChange ? formatChanges(item.changes) : formatMovement(item)}</span>
              {meta}
            </div>
          </div>
        </div>
      );
    }

    case CHAT_KIND.action: {
      // A full bubble in red (044: reactions, quote, reply, convert, delete); a cancelled one is muted and struck.
      const cancelled = !!item.cancelled;
      return row(
        `stm-chat-message is-action${cancelled ? ' is-cancelled' : ''}${own ? ' is-own' : ''}${continued ? ' is-continued' : ''}`,
        <>
          <div className="stm-chat-avatar">
            {!continued && <CharacterAvatar name={chatLabel(item.displayName)} imageUrl={item.displayImageUrl} size={32} />}
          </div>
          <div className="stm-chat-bubble">
            {!continued && (
              <div className="stm-chat-name" style={{ color: nameColor(item.displayName) }}>
                {chatLabel(item.displayName)}
                {item.authorLabel && <span className="stm-chat-author"> · {authorLabel(item.authorLabel)}</span>}
              </div>
            )}
            {quote}
            {cancelled && <div className="stm-chat-cancelled-label">{t('chat.actionCancelled')}</div>}
            <div className="stm-chat-captioned">
              <span className="stm-chat-kind-icon"><LightningIcon size={12} /></span>
              <span className="stm-chat-plain stm-chat-text">{item.description ?? ''}</span>
              {meta}
            </div>
            {reactions}
          </div>
        </>,
        item.text ?? undefined,
      );
    }

    case CHAT_KIND.actionResult:
      return (
        <div className="stm-chat-result">
          <div className="stm-chat-result-head">
            <span>{t('chat.result', { name: shortName(item.displayName) })}</span>
            <time className="stm-chat-time">{timeOf(item.createdAt)}</time>
          </div>
          <div className="stm-chat-plain">{item.description ?? ''}</div>
        </div>
      );

    case CHAT_KIND.narration:
      return row(
        `stm-chat-narration${item.deleted ? ' is-deleted' : ''}`,
        <>
          <div className="stm-chat-narration-head">
            <span>{t('chat.narration', { author: chatLabel(item.authorLabel ?? item.displayName) })}</span>
            <time className="stm-chat-time">{timeOf(item.createdAt)}</time>
          </div>
          {quote}
          {item.deleted
            ? <em className="text-body-secondary">{t('chat.deleted')}</em>
            : <Text value={item.text ?? item.description ?? ''} />}
          {reactions}
        </>,
      );

    default: {
      // Conversation: text, photo, recording, roll or poll (the poll's text is its question, shown by the card).
      const caption = item.kind !== CHAT_KIND.poll && item.text?.trim() ? item.text : null;
      return row(
        `stm-chat-message${own ? ' is-own' : ''}${continued ? ' is-continued' : ''}`,
        <>
          {!own && (
            <div className="stm-chat-avatar">
              {!continued && <CharacterAvatar name={chatLabel(item.displayName)} imageUrl={item.displayImageUrl} size={32} />}
            </div>
          )}
          <div className="stm-chat-bubble">
            {!own && !continued && (
              <div className="stm-chat-name" style={{ color: nameColor(item.displayName) }}>{chatLabel(item.displayName)}</div>
            )}
            {item.deleted ? (
              <div className="stm-chat-text"><em className="text-body-secondary">{t('chat.deleted')}</em>{meta}</div>
            ) : (
              <>
                {quote}
                {item.kind === CHAT_KIND.image && item.imageUrl && (imageFailed
                  ? <span className="text-body-secondary small">{t('chat.imageFailed')}</span>
                  : (
                    <button type="button" className="stm-chat-image" onClick={() => onOpenImage(item.imageUrl!, caption)}
                      title={t('chat.openImage')} aria-label={t('chat.openImage')}>
                      <img src={item.imageUrl} alt={caption ?? t('chat.image')} loading="lazy" onError={() => setImageFailed(true)} />
                    </button>
                  ))}
                {item.kind === CHAT_KIND.audio && <AudioPlayer item={item} />}
                {item.kind === CHAT_KIND.roll && <RollResult dice={item.dice ?? []} />}
                {item.kind === CHAT_KIND.poll && <PollCard item={item} />}
                {caption ? <div className="stm-chat-captioned"><Text value={caption} />{meta}</div> : <div className="stm-chat-meta-row">{meta}</div>}
                {reactions}
              </>
            )}
          </div>
        </>,
      );
    }
  }
};

export default ChatItem;
