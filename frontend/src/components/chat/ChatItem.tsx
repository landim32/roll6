import { lazy, Suspense, useState } from 'react';
import * as DropdownMenu from '@radix-ui/react-dropdown-menu';
import { useTranslation } from 'react-i18next';
import { CharacterAvatar } from '../ui/CharacterAvatar';
import {
  Dice1Icon, Dice2Icon, Dice3Icon, Dice4Icon, Dice5Icon, Dice6Icon, DotsIcon, LightningIcon, MoveIcon, PencilIcon,
} from '../ui/icons';
import { CHAT_KIND } from '../../types/chat';
import type { ChatItemInfo } from '../../types/chat';
import { formatChanges, formatMovement, nameColor, rollTotal, shortName } from '../../lib/chatItems';
import { formatSeconds } from '../../lib/audioFormat';

const MarkdownView = lazy(() => import('../ui/MarkdownView'));

interface ChatItemProps {
  item: ChatItemInfo;
  /** Continues the previous item: no avatar and name again. */
  continued: boolean;
  own: boolean;
  onDelete: (item: ChatItemInfo) => void;
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

const ItemMenu = ({ item, onDelete }: { item: ChatItemInfo; onDelete: (item: ChatItemInfo) => void }) => {
  const { t } = useTranslation();
  if (!item.canDelete) return null;
  return (
    <DropdownMenu.Root modal={false}>
      <DropdownMenu.Trigger className="btn btn-sm stm-chat-menu" title={t('chat.menu')} aria-label={t('chat.menu')}>
        <DotsIcon size={20} />
      </DropdownMenu.Trigger>
      <DropdownMenu.Portal>
        <DropdownMenu.Content className="dropdown-menu show stm-user-menu" align="end" sideOffset={4}>
          <DropdownMenu.Item className="dropdown-item text-danger" onSelect={() => onDelete(item)}>
            {t('chat.delete')}
          </DropdownMenu.Item>
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  );
};

/** One entry of the campaign's timeline, drawn by kind (041, research D13). */
export const ChatItem = ({ item, continued, own, onDelete, onOpenImage }: ChatItemProps) => {
  const { t } = useTranslation();
  const [imageFailed, setImageFailed] = useState(false);

  switch (item.kind) {
    case CHAT_KIND.turnFinished:
      return (
        <div className="stm-chat-divider" role="separator">
          <span>{t('chat.turnFinished', { no: item.turnNo })}</span>
        </div>
      );

    case CHAT_KIND.movement:
    case CHAT_KIND.action:
    case CHAT_KIND.characterUpdate: {
      // Like a chat bubble: actions in red, moves and character changes smaller and gray. The actor's name always
      // shows on the first bubble of a run, because the master moves and acts for many pieces.
      const isAction = item.kind === CHAT_KIND.action;
      const isChange = item.kind === CHAT_KIND.characterUpdate;
      const meta = <time className="stm-chat-meta">{timeOf(item.createdAt)}</time>;
      return (
        <div className={`stm-chat-message ${isAction ? 'is-action' : 'is-movement'}${own ? ' is-own' : ''}${continued ? ' is-continued' : ''}`}
          title={item.text ?? undefined}>
          <div className="stm-chat-avatar">
            {!continued && <CharacterAvatar name={item.displayName} imageUrl={item.displayImageUrl} size={isAction ? 32 : 24} />}
          </div>
          <div className="stm-chat-bubble">
            {!continued && (
              <div className="stm-chat-name" style={isAction ? { color: nameColor(item.displayName) } : undefined}>
                {item.displayName}
                {item.authorLabel && <span className="stm-chat-author"> · {item.authorLabel}</span>}
              </div>
            )}
            <div className="stm-chat-captioned">
              <span className="stm-chat-kind-icon">
                {isAction ? <LightningIcon size={12} /> : isChange ? <PencilIcon size={12} /> : <MoveIcon size={12} />}
              </span>
              <span className="stm-chat-plain stm-chat-text">
                {isAction ? (item.description ?? '') : isChange ? formatChanges(item.changes) : formatMovement(item)}
              </span>
              {meta}
            </div>
          </div>
        </div>
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
      return (
        <div className={`stm-chat-narration${item.deleted ? ' is-deleted' : ''}`}>
          <div className="stm-chat-narration-head">
            <span>{t('chat.narration', { author: item.authorLabel ?? item.displayName })}</span>
            <time className="stm-chat-time">{timeOf(item.createdAt)}</time>
            <ItemMenu item={item} onDelete={onDelete} />
          </div>
          {item.deleted
            ? <em className="text-body-secondary">{t('chat.deleted')}</em>
            : <Text value={item.text ?? item.description ?? ''} />}
        </div>
      );

    default: {
      // Conversation: text, photo or recording.
      const caption = item.text?.trim() ? item.text : null;
      const meta = <time className="stm-chat-meta">{timeOf(item.createdAt)}</time>;
      return (
        <div className={`stm-chat-message${own ? ' is-own' : ''}${continued ? ' is-continued' : ''}`}>
          {!own && (
            <div className="stm-chat-avatar">
              {!continued && <CharacterAvatar name={item.displayName} imageUrl={item.displayImageUrl} size={32} />}
            </div>
          )}
          <div className="stm-chat-bubble">
            {!own && !continued && (
              <div className="stm-chat-name" style={{ color: nameColor(item.displayName) }}>{item.displayName}</div>
            )}
            {item.deleted ? (
              <div className="stm-chat-text"><em className="text-body-secondary">{t('chat.deleted')}</em>{meta}</div>
            ) : (
              <>
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
                {caption ? <div className="stm-chat-captioned"><Text value={caption} />{meta}</div> : <div className="stm-chat-meta-row">{meta}</div>}
              </>
            )}
          </div>
          <ItemMenu item={item} onDelete={onDelete} />
        </div>
      );
    }
  }
};

export default ChatItem;
