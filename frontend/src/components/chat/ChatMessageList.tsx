import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ChatItem } from './ChatItem';
import { ChatItemActions } from './ChatItemActions';
import { AnswerEditModal } from './AnswerEditModal';
import { ImageLightbox } from './ImageLightbox';
import { ConfirmModal } from '../ui/ConfirmModal';
import { useAuth } from '../../hooks/useAuth';
import { useChat } from '../../hooks/useChat';
import { canEditAnswer, compareCursors, continuesPrevious, voiceSwitch } from '../../lib/chatItems';
import { useCampaign } from '../../hooks/useCampaign';
import { filterChatItems } from '../../lib/chatFilters';
import { copyToClipboard } from '../../lib/clipboard';
import type { ChatItemInfo } from '../../types/chat';
import { toast } from 'sonner';

/** Distance from the bottom (px) still treated as "at the bottom": new messages keep the list there. */
const STICK_PX = 48;

/** The timeline, newest at the bottom; scrolling to the top loads older entries keeping the reading position. */
export const ChatMessageList = () => {
  const { t } = useTranslation();
  const { session } = useAuth();
  const {
    items: allItems, pinnedPolls, hasMore, loading, pending, firstUnreadCursor, loadOlder, retry, discard, remove, filters, startReply,
    react, convert, closePoll, setSpeaker, speaker, editAnswer,
  } = useChat();
  const { isMaster } = useCampaign();
  // Moves and character changes show only when the user turned them on in the paperclip.
  const items = useMemo(() => filterChatItems(allItems, filters), [allItems, filters]);
  /** "Novas mensagens" goes before the first unread item still shown (the first unread may be a hidden one). */
  const unreadKey = useMemo(() => (firstUnreadCursor === null ? null
    : items.find((item) => compareCursors(item.cursor, firstUnreadCursor) >= 0)?.key ?? null), [items, firstUnreadCursor]);
  const scrollRef = useRef<HTMLDivElement>(null);
  const sentinelRef = useRef<HTMLDivElement>(null);
  const unreadRef = useRef<HTMLDivElement>(null);
  const atBottomRef = useRef(true);
  /** Scroll height before older items were put on top, to keep what the user was reading in place. */
  const heightBeforeRef = useRef<number | null>(null);
  const firstKeyRef = useRef<string | null>(null);
  const openedRef = useRef(false);
  const [toDelete, setToDelete] = useState<ChatItemInfo | null>(null);
  /** 093: the answer the master is correcting. */
  const [editing, setEditing] = useState<ChatItemInfo | null>(null);
  const [image, setImage] = useState<{ url: string; caption: string | null } | null>(null);
  const userId = session?.user.userId ?? null;
  /** The entry whose action bar is open (044) and the bubble it floats over. */
  const [actions, setActions] = useState<{ item: ChatItemInfo; anchor: HTMLElement } | null>(null);
  /** The original of a quote just tapped, highlighted for a moment. */
  const [flashKey, setFlashKey] = useState<string | null>(null);
  const itemsRef = useRef(items);
  itemsRef.current = items;
  const hasMoreRef = useRef(hasMore);
  hasMoreRef.current = hasMore;

  const run = (work: () => Promise<void>) => {
    work().catch((err: unknown) => toast.error(err instanceof Error ? err.message : t('common.unknownError')));
  };

  /** Scrolls to an entry, loading older pages until it shows up (at most 10), and flashes it. */
  const openQuote = async (key: string) => {
    for (let page = 0; page <= 10; page += 1) {
      const element = scrollRef.current?.querySelector<HTMLElement>(`[data-chat-key="${key}"]`);
      if (element) {
        element.scrollIntoView({ block: 'center', behavior: 'smooth' });
        setFlashKey(key);
        window.setTimeout(() => setFlashKey((current) => (current === key ? null : current)), 1200);
        return;
      }
      if (!hasMoreRef.current) break;
      heightBeforeRef.current = scrollRef.current?.scrollHeight ?? null;
      await loadOlder();
      await new Promise((resolve) => window.requestAnimationFrame(resolve));
    }
    toast.info(t('chat.originalNotFound'));
  };

  const onScroll = () => {
    const el = scrollRef.current;
    if (el) atBottomRef.current = el.scrollHeight - el.scrollTop - el.clientHeight <= STICK_PX;
  };

  // Older items on top: keep the offset. New items at the bottom: follow them when the user was already there.
  useLayoutEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const firstKey = items[0]?.key ?? null;
    if (!openedRef.current && items.length > 0) {
      openedRef.current = true;
      // Opening: at "Novas mensagens" when there is something unread, else at the bottom.
      if (unreadRef.current) unreadRef.current.scrollIntoView({ block: 'start' });
      else el.scrollTop = el.scrollHeight;
    } else if (heightBeforeRef.current !== null && firstKey !== firstKeyRef.current) {
      el.scrollTop += el.scrollHeight - heightBeforeRef.current;
    } else if (atBottomRef.current) {
      el.scrollTop = el.scrollHeight;
    }
    heightBeforeRef.current = null;
    firstKeyRef.current = firstKey;
    onScroll();
  }, [items, pending, pinnedPolls]);

  // A new campaign (empty list) opens again at the right place.
  useEffect(() => {
    if (items.length === 0) openedRef.current = false;
  }, [items.length]);

  useEffect(() => {
    const el = sentinelRef.current;
    if (!el || !hasMore) return;
    const observer = new IntersectionObserver(([entry]) => {
      if (!entry.isIntersecting) return;
      heightBeforeRef.current = scrollRef.current?.scrollHeight ?? null;
      void loadOlder();
    }, { root: scrollRef.current, rootMargin: '200px 0px 0px 0px' });
    observer.observe(el);
    return () => observer.disconnect();
  }, [hasMore, loadOlder]);

  const onConfirmDelete = async () => {
    if (!toDelete) return;
    try {
      await remove(toDelete);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t('common.unknownError'));
      throw err;
    }
  };

  const renderItem = (item: ChatItemInfo, continued: boolean) => (
    <ChatItem
      item={item}
      continued={continued}
      own={item.userId === userId}
      userId={userId}
      flash={item.key === flashKey}
      onActions={(target, anchor) => setActions({ item: target, anchor })}
      onReply={startReply}
      onOpenQuote={(key) => { void openQuote(key); }}
      onOpenImage={(url, caption) => setImage({ url, caption })}
    />
  );

  return (
    <div className="stm-chat-scroll" ref={scrollRef} onScroll={onScroll}>
      {hasMore && <div ref={sentinelRef} className="stm-chat-sentinel" />}
      {!loading && items.length === 0 && pending.length === 0 && pinnedPolls.length === 0 && (
        <p className="stm-chat-empty text-body-secondary">{t('chat.empty')}</p>
      )}
      {items.map((item, index) => (
        <div key={item.key} data-chat-key={item.key}>
          {item.key === unreadKey && (
            <div ref={unreadRef} className="stm-chat-unread" role="separator"><span>{t('chat.newMessages')}</span></div>
          )}
          {renderItem(item, index > 0 && item.key !== unreadKey && continuesPrevious(items[index - 1], item))}
        </div>
      ))}
      {pending.map((p) => (
        <div key={p.id} className="stm-chat-message is-own is-pending">
          <div className="stm-chat-bubble">
            <div className="stm-chat-plain">{p.preview}</div>
            {p.status === 'sending' ? (
              <small className="text-body-secondary">{t('chat.sending')}</small>
            ) : (
              <small className="text-danger">
                {t('chat.failed')}{' '}
                <button type="button" className="btn btn-link btn-sm p-0 align-baseline" onClick={() => { void retry(p.id); }}>
                  {t('chat.retry')}
                </button>{' · '}
                <button type="button" className="btn btn-link btn-sm p-0 align-baseline" onClick={() => discard(p.id)}>
                  {t('chat.discard')}
                </button>
              </small>
            )}
          </div>
        </div>
      ))}
      {/* 050: open polls stay below everything until every approved character has voted. */}
      {pinnedPolls.map((item) => (
        <div key={item.key} data-chat-key={item.key}>
          {renderItem(item, false)}
        </div>
      ))}
      <ConfirmModal
        open={toDelete !== null}
        onOpenChange={(o) => { if (!o) setToDelete(null); }}
        title={t(toDelete?.kind === 'action' ? 'chat.cancelActionTitle' : 'chat.deleteTitle')}
        message={t(toDelete?.kind === 'action' ? 'chat.cancelActionMessage' : 'chat.deleteMessage')}
        confirmLabel={t(toDelete?.kind === 'action' ? 'chat.cancelAction' : 'chat.delete')}
        onConfirm={onConfirmDelete}
        danger
      />
      <ImageLightbox image={image} onClose={() => setImage(null)} />
      <AnswerEditModal item={editing} onClose={() => setEditing(null)} onSave={editAnswer} />
      {actions && (() => {
        const shown = allItems.find((i) => i.key === actions.item.key) ?? pinnedPolls.find((i) => i.key === actions.item.key) ?? actions.item;
        // 079: the master who also plays may switch the voice of his own message — to the character selected now.
        const selected = speaker?.characterId != null && speaker.participation
          ? { characterId: speaker.characterId, name: speaker.participation.characterName }
          : null;
        const voice = voiceSwitch(shown, { userId, isMaster, selected });
        return (
          <ChatItemActions
            item={shown}
            voice={voice}
            onVoice={() => run(() => setSpeaker(shown, voice?.to === 'character' ? voice.characterId : null))}
            anchor={actions.anchor}
            userId={userId}
            onClose={() => setActions(null)}
            onReact={(kind) => run(() => react(actions.item, kind))}
            onReply={() => startReply(actions.item)}
            onConvert={(to) => run(() => convert(actions.item, to))}
            onDelete={() => setToDelete(actions.item)}
            onClosePoll={() => run(() => closePoll(actions.item))}
            onEditAnswer={canEditAnswer(shown, isMaster) ? () => setEditing(shown) : undefined}
            onCopy={(text) => { void copyToClipboard(text).then((ok) => (ok ? toast.success(t('chat.copied')) : toast.error(t('chat.copyFailed')))); }}
          />
        );
      })()}
    </div>
  );
};

export default ChatMessageList;
