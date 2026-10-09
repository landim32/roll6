import { lazy, Suspense, useState } from 'react';
import * as DropdownMenu from '@radix-ui/react-dropdown-menu';
import { useTranslation } from 'react-i18next';
import { CharacterAvatar } from '../ui/CharacterAvatar';
import { DotsIcon, LightningIcon, MoveIcon, PencilIcon } from '../ui/icons';
import { CHAT_KIND } from '../../types/chat';
import type { ChatItemInfo } from '../../types/chat';
import { formatChanges, formatMovement, shortName } from '../../lib/chatItems';
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

const ItemMenu = ({ item, onDelete }: { item: ChatItemInfo; onDelete: (item: ChatItemInfo) => void }) => {
  const { t } = useTranslation();
  if (!item.canDelete) return null;
  return (
    <DropdownMenu.Root modal={false}>
      <DropdownMenu.Trigger className="btn btn-sm stm-chat-menu" title={t('chat.menu')} aria-label={t('chat.menu')}>
        <DotsIcon size={14} />
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
      const icon = item.kind === CHAT_KIND.movement ? <MoveIcon size={12} />
        : item.kind === CHAT_KIND.action ? <LightningIcon size={12} /> : <PencilIcon size={12} />;
      const detail = item.kind === CHAT_KIND.movement ? formatMovement(item)
        : item.kind === CHAT_KIND.action ? (item.description ?? '') : formatChanges(item.changes);
      return (
        <div className={`stm-chat-discreet${continued ? ' is-continued' : ''}`} title={item.text ?? undefined}>
          <span className="stm-chat-discreet-icon">{icon}</span>
          <span className="stm-chat-discreet-text">
            <strong>{shortName(item.displayName)}</strong>
            {item.authorLabel && <span className="text-body-secondary"> · {item.authorLabel}</span>}
            {item.kind === CHAT_KIND.action ? ': ' : ' '}
            {detail}
          </span>
          <time className="stm-chat-time">{timeOf(item.createdAt)}</time>
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
      return (
        <div className={`stm-chat-message${own ? ' is-own' : ''}${continued ? ' is-continued' : ''}`}>
          <div className="stm-chat-avatar">
            {!continued && <CharacterAvatar name={item.displayName} imageUrl={item.displayImageUrl} size={32} />}
          </div>
          <div className="stm-chat-bubble">
            {!continued && (
              <div className="stm-chat-head">
                <span className="stm-chat-name">{item.displayName}</span>
                <time className="stm-chat-time">{timeOf(item.createdAt)}</time>
              </div>
            )}
            {item.deleted ? (
              <em className="text-body-secondary">{t('chat.deleted')}</em>
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
                {caption && <Text value={caption} />}
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
