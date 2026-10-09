import { createContext, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { chatService } from '../Services/chatService';
import { pushService } from '../Services/pushService';
import type { PokeResultInfo } from '../types/push';
import { useAuth } from '../hooks/useAuth';
import { useCampaign } from '../hooks/useCampaign';
import { useCharacter } from '../hooks/useCharacter';
import { useRealtime, useTableEvents } from '../hooks/useRealtime';
import { CHAT_KIND } from '../types/chat';
import type { ChatItemInfo, ChatSendInfo } from '../types/chat';
import { TABLE_EVENT } from '../types/realtime';
import { CAMPAIGN_CHARACTER_STATUS } from '../types/campaignCharacter';
import type { CampaignCharacterInfo } from '../types/campaignCharacter';
import { CONVERSATION_KINDS, compareCursors, markDeleted, mergeItems, reconcileRange } from '../lib/chatItems';
import { isChatVisible, readLayoutMode, writeLayoutMode } from '../lib/layoutMode';
import { isShown, readChatFilters, writeChatFilters } from '../lib/chatFilters';
import type { ChatFilters } from '../lib/chatFilters';
import type { LayoutMode } from '../lib/layoutMode';

/** Without the real-time channel the chat is reloaded this often while the tab is visible. */
const CHAT_POLL_MS = 15_000;
/** A refresh reads this many of the newest items (the API's maximum). */
const REFRESH_LIMIT = 100;
/** Marking as read waits for the list to settle. */
const MARK_READ_DELAY_MS = 800;

/** Who the user speaks as: one of their approved characters, or the master as such (characterId null). */
export interface ChatSpeaker {
  characterId: number | null;
  participation: CampaignCharacterInfo | null;
}

/** A message still on its way (or that failed): shown at the bottom until the server answers. */
export interface ChatPending {
  id: string;
  info: ChatSendInfo;
  /** What the bubble shows meanwhile. */
  preview: string;
  status: 'sending' | 'failed';
}

interface ChatContextType {
  /** The campaign's timeline, oldest first. */
  items: ChatItemInfo[];
  hasMore: boolean;
  /** Entries by others not read yet (shown as a badge while the chat is hidden). */
  unreadCount: number;
  /** Where "Novas mensagens" goes when the chat opens. */
  firstUnreadCursor: string | null;
  pending: ChatPending[];
  loading: boolean;
  /** Whether the user may read this campaign's chat (master or approved participant). */
  canRead: boolean;
  speaker: ChatSpeaker | null;
  layoutMode: LayoutMode;
  /** Moves and character changes the user chose to see (hidden by default, per user). */
  filters: ChatFilters;
  setFilters: (filters: ChatFilters) => void;
  setLayoutMode: (mode: LayoutMode) => void;
  loadOlder: () => Promise<void>;
  send: (info: Omit<ChatSendInfo, 'characterId'>, preview: string) => Promise<boolean>;
  retry: (id: string) => Promise<void>;
  discard: (id: string) => void;
  remove: (item: ChatItemInfo) => Promise<void>;
  /** Rolls 3d6 as the speaker, with an optional reason. */
  roll: (text: string | null) => Promise<void>;
  /** Pokes who hasn't acted in the turn (043); the chat line comes back merged. */
  poke: () => Promise<PokeResultInfo>;
}

const ChatContext = createContext<ChatContextType | undefined>(undefined);

let pendingSeq = 0;

export const ChatProvider = ({ children }: { children: ReactNode }) => {
  const { session } = useAuth();
  const { currentCampaign, isMaster } = useCampaign();
  const { myParticipations, currentSelection } = useCharacter();
  const { live, setPresence } = useRealtime();
  const [items, setItems] = useState<ChatItemInfo[]>([]);
  const [hasMore, setHasMore] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [firstUnreadCursor, setFirstUnreadCursor] = useState<string | null>(null);
  const [pending, setPending] = useState<ChatPending[]>([]);
  const [loading, setLoading] = useState(false);
  const [layoutMode, setLayoutModeState] = useState<LayoutMode>(readLayoutMode);
  const [filters, setFiltersState] = useState<ChatFilters>(() => readChatFilters(session?.user.userId ?? null));
  const filtersRef = useRef(filters);
  filtersRef.current = filters;
  const [tabVisible, setTabVisible] = useState(() => document.visibilityState === 'visible');
  /** Campaign whose chat is wanted; late responses for another campaign are dropped. */
  const campaignRef = useRef<number | null>(null);
  const itemsRef = useRef<ChatItemInfo[]>([]);
  itemsRef.current = items;
  const loadingOlderRef = useRef(false);

  const userId = session?.user.userId ?? null;
  const campaignId = currentCampaign?.campaignId ?? null;
  const approved = useMemo(() => myParticipations.filter(
    (p) => p.campaignId === campaignId && p.status === CAMPAIGN_CHARACTER_STATUS.approved), [myParticipations, campaignId]);
  const canRead = !!session && campaignId !== null && (isMaster || approved.length > 0);
  const visible = canRead && isChatVisible(layoutMode) && tabVisible;
  const visibleRef = useRef(visible);
  visibleRef.current = visible;

  const speaker = useMemo<ChatSpeaker | null>(() => {
    if (!canRead) return null;
    if (typeof currentSelection === 'number') {
      const participation = approved.find((p) => p.characterId === currentSelection);
      if (participation) return { characterId: participation.characterId, participation };
    }
    return isMaster ? { characterId: null, participation: null } : null;
  }, [canRead, currentSelection, approved, isMaster]);

  /** Items from events were mapped for their author: whether this user may delete them is decided here. */
  const forViewer = useCallback((item: ChatItemInfo): ChatItemInfo => {
    if (item.deleted) return { ...item, canDelete: false };
    // A roll can't be taken back by whoever made it: only the master removes one.
    const canDelete = item.kind === CHAT_KIND.roll
      ? isMaster
      : CONVERSATION_KINDS.has(item.kind)
      ? item.userId === userId || isMaster
      : item.kind === CHAT_KIND.narration && isMaster;
    return { ...item, canDelete };
  }, [userId, isMaster]);

  /** New entries by others count as unread while the chat is out of sight. */
  const countNew = useCallback((before: ChatItemInfo[], after: ChatItemInfo[]) => {
    if (visibleRef.current) return;
    const known = new Set(before.map((i) => i.key));
    // What the user chose not to see doesn't count as unread either.
    const added = after.filter((i) => !known.has(i.key) && i.userId !== userId && !i.deleted && isShown(i, filtersRef.current)).length;
    if (added > 0) setUnreadCount((n) => n + added);
  }, [userId]);

  const loadNewest = useCallback(async () => {
    campaignRef.current = canRead ? campaignId : null;
    if (!canRead || campaignId === null) return;
    try {
      setLoading(true);
      const page = await chatService.list(campaignId);
      if (campaignRef.current !== campaignId) return;
      setItems(page.items);
      setHasMore(page.hasMore);
      setUnreadCount(page.unreadCount);
      setFirstUnreadCursor(page.firstUnreadCursor);
    } catch {
      // 403 (lost access) or network: keep quiet; 401 is handled globally.
    } finally {
      setLoading(false);
    }
  }, [canRead, campaignId]);

  /** Re-reads the newest page: new entries come in, undone or corrected turn records change or leave. */
  const refreshRecent = useCallback(async () => {
    if (!canRead || campaignId === null) return;
    if (itemsRef.current.length === 0) {
      await loadNewest();
      return;
    }
    try {
      const page = await chatService.list(campaignId, { limit: REFRESH_LIMIT });
      if (campaignRef.current !== campaignId) return;
      const current = itemsRef.current;
      const last = current[current.length - 1];
      // A gap between what is shown and the fresh page: start over from the fresh page.
      const gap = page.hasMore && page.items.length > 0 && compareCursors(page.items[0].cursor, last.cursor) > 0;
      const next = gap ? page.items : reconcileRange(current, page.items);
      countNew(current, next);
      setItems(next);
      if (gap) setHasMore(true);
    } catch {
      // Next event or poll tries again.
    }
  }, [canRead, campaignId, loadNewest, countNew]);

  // Campaign switch (or lost access): start over.
  useEffect(() => {
    setItems([]);
    setHasMore(false);
    setUnreadCount(0);
    setFirstUnreadCursor(null);
    setPending([]);
    void loadNewest();
  }, [loadNewest]);

  const loadOlder = useCallback(async () => {
    const first = itemsRef.current[0];
    if (!canRead || campaignId === null || !first || loadingOlderRef.current) return;
    loadingOlderRef.current = true;
    try {
      const page = await chatService.list(campaignId, { before: first.cursor });
      if (campaignRef.current !== campaignId) return;
      setItems((current) => mergeItems(current, page.items));
      setHasMore(page.hasMore);
    } catch {
      // The sentinel asks again when it comes back into view.
    } finally {
      loadingOlderRef.current = false;
    }
  }, [canRead, campaignId]);

  useTableEvents((event) => {
    if (event.type === TABLE_EVENT.chatMessage) {
      const item = forViewer(event.data as ChatItemInfo);
      if (item.campaignId !== campaignRef.current) return;
      const current = itemsRef.current;
      const next = mergeItems(current, [item]);
      countNew(current, next);
      setItems(next);
    } else if (event.type === TABLE_EVENT.chatDeleted) {
      const { itemKey } = event.data as { itemKey: string };
      setItems((current) => markDeleted(current, itemKey));
    } else if (event.type === TABLE_EVENT.turnChanged || event.type === TABLE_EVENT.turnFinished) {
      void refreshRecent();
    } else if (event.type === TABLE_EVENT.resync) {
      void refreshRecent();
    }
  });

  // Without the real-time channel: every 15 s while the tab is visible.
  useEffect(() => {
    if (!canRead || live) return;
    const timer = window.setInterval(() => {
      if (document.visibilityState === 'visible') void refreshRecent();
    }, CHAT_POLL_MS);
    return () => window.clearInterval(timer);
  }, [canRead, live, refreshRecent]);

  // The server must know whether the chat is on screen (043): no push for what one is looking at.
  useEffect(() => {
    setPresence(tabVisible, visible);
  }, [tabVisible, visible, setPresence]);

  useEffect(() => {
    const onVisibility = () => setTabVisible(document.visibilityState === 'visible');
    document.addEventListener('visibilitychange', onVisibility);
    return () => document.removeEventListener('visibilitychange', onVisibility);
  }, []);

  // While the chat is on screen everything shown is read: move the mark up to the last item.
  const lastCursor = items.length > 0 ? items[items.length - 1].cursor : null;
  useEffect(() => {
    if (!visible || campaignId === null || lastCursor === null) return;
    setUnreadCount(0);
    const timer = window.setTimeout(() => {
      void chatService.markRead(campaignId, lastCursor).catch(() => undefined);
    }, MARK_READ_DELAY_MS);
    return () => window.clearTimeout(timer);
  }, [visible, campaignId, lastCursor]);

  // Each user has their own choice: reload it when someone else logs in.
  useEffect(() => {
    setFiltersState(readChatFilters(userId));
  }, [userId]);

  const setFilters = useCallback((next: ChatFilters) => {
    setFiltersState(next);
    writeChatFilters(userId, next);
  }, [userId]);

  const setLayoutMode = useCallback((mode: LayoutMode) => {
    setLayoutModeState(mode);
    writeLayoutMode(mode);
  }, []);

  const deliver = useCallback(async (entry: ChatPending) => {
    if (campaignId === null) return;
    setPending((list) => list.map((p) => (p.id === entry.id ? { ...p, status: 'sending' } : p)));
    try {
      const item = await chatService.send(campaignId, entry.info);
      setPending((list) => list.filter((p) => p.id !== entry.id));
      if (campaignRef.current === campaignId) setItems((current) => mergeItems(current, [forViewer(item)]));
      // Speaking is reading: the divider has done its job.
      setFirstUnreadCursor(null);
    } catch {
      setPending((list) => list.map((p) => (p.id === entry.id ? { ...p, status: 'failed' } : p)));
      throw new Error('send failed');
    }
  }, [campaignId, forViewer]);

  const send = useCallback(async (info: Omit<ChatSendInfo, 'characterId'>, preview: string) => {
    if (!speaker) return false;
    pendingSeq += 1;
    const entry: ChatPending = {
      id: `p${pendingSeq}`, info: { ...info, characterId: speaker.characterId }, preview, status: 'sending',
    };
    setPending((list) => [...list, entry]);
    try {
      await deliver(entry);
      return true;
    } catch {
      return false;
    }
  }, [speaker, deliver]);

  const retry = useCallback(async (id: string) => {
    const entry = pending.find((p) => p.id === id);
    if (entry) await deliver(entry).catch(() => undefined);
  }, [pending, deliver]);

  const discard = useCallback((id: string) => {
    setPending((list) => list.filter((p) => p.id !== id));
  }, []);

  const remove = useCallback(async (item: ChatItemInfo) => {
    await chatService.remove(item.turnId);
    setItems((current) => markDeleted(current, item.key));
  }, []);

  const roll = useCallback(async (text: string | null) => {
    if (!speaker || campaignId === null) return;
    const item = await chatService.roll(campaignId, { characterId: speaker.characterId, text });
    if (campaignRef.current === campaignId) setItems((current) => mergeItems(current, [forViewer(item)]));
    setFirstUnreadCursor(null);
  }, [speaker, campaignId, forViewer]);

  const poke = useCallback(async () => {
    if (campaignId === null) return { poked: 0, names: [] };
    const result = await pushService.poke(campaignId);
    if (result.item && campaignRef.current === campaignId) setItems((current) => mergeItems(current, [forViewer(result.item!)]));
    return { poked: result.poked, names: result.names };
  }, [campaignId, forViewer]);

  const value = useMemo<ChatContextType>(() => ({
    items, hasMore, unreadCount, firstUnreadCursor, pending, loading, canRead, speaker, layoutMode, setLayoutMode,
    filters, setFilters, loadOlder, send, retry, discard, remove, roll, poke,
  }), [items, hasMore, unreadCount, firstUnreadCursor, pending, loading, canRead, speaker, layoutMode, setLayoutMode,
    filters, setFilters,
    loadOlder, send, retry, discard, remove, roll, poke]);

  return <ChatContext.Provider value={value}>{children}</ChatContext.Provider>;
};

export default ChatContext;
