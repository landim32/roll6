import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ChatItem } from './ChatItem';
import { ChatItemActions } from './ChatItemActions';
import { ImageLightbox } from './ImageLightbox';
import { ConfirmModal } from '../ui/ConfirmModal';
import { useAuth } from '../../hooks/useAuth';
import { useChat } from '../../hooks/useChat';
import { compareCursors, continuesPrevious } from '../../lib/chatItems';
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
    items: allItems, hasMore, loading, pending, firstUnreadCursor, loadOlder, retry, discard, remove, filters, startReply, react, convert,
  } = useChat();
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
  }, [items, pending]);

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

  return (
    <div className="stm-chat-scroll" ref={scrollRef} onScroll={onScroll}>
      {hasMore && <div ref={sentinelRef} className="stm-chat-sentinel" />}
      {!loading && items.length === 0 && pending.length === 0 && (
        <p className="stm-chat-empty text-body-secondary">{t('chat.empty')}</p>
      )}
      {items.map((item, index) => (
        <div key={item.key} data-chat-key={item.key}>
          {item.key === unreadKey && (
            <div ref={unreadRef} className="stm-chat-unread" role="separator"><span>{t('chat.newMessages')}</span></div>
          )}
          <ChatItem
            item={item}
            continued={index > 0 && item.key !== unreadKey && continuesPrevious(items[index - 1], item)}
            own={item.userId === userId}
            userId={userId}
            flash={item.key === flashKey}
            onActions={(target, anchor) => setActions({ item: target, anchor })}
            onReply={startReply}
            onOpenQuote={(key) => { void openQuote(key); }}
            onOpenImage={(url, caption) => setImage({ url, caption })}
          />
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
      {actions && (
        <ChatItemActions
          item={allItems.find((i) => i.key === actions.item.key) ?? actions.item}
          anchor={actions.anchor}
          userId={userId}
          onClose={() => setActions(null)}
          onReact={(kind) => run(() => react(actions.item, kind))}
          onReply={() => startReply(actions.item)}
          onConvert={(to) => run(() => convert(actions.item, to))}
          onDelete={() => setToDelete(actions.item)}
          onCopy={(text) => { void copyToClipboard(text).then((ok) => (ok ? toast.success(t('chat.copied')) : toast.error(t('chat.copyFailed')))); }}
        />
      )}
    </div>
  );
};

export default ChatMessageList;
