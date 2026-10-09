import { createContext, useCallback, useEffect, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { turnService } from '../Services/turnService';
import { TURN_STORAGE_KEY } from '../Services/apiHelpers';
import { useAuth } from '../hooks/useAuth';
import { useCampaign } from '../hooks/useCampaign';
import { useCharacter } from '../hooks/useCharacter';
import { useMapToken } from '../hooks/useMapToken';
import { useRealtime, useTableEvents } from '../hooks/useRealtime';
import { TABLE_EVENT } from '../types/realtime';
import { markAllTurnsRead, markTurnRead, trackTurn } from '../lib/turnStatus';
import type { TurnSeen } from '../lib/turnStatus';
import { CAMPAIGN_CHARACTER_STATUS } from '../types/campaignCharacter';
import type { TurnFinishResultInfo, TurnInfo, TurnResetResultInfo } from '../types/turn';

/** The turn is polled this often while the tab is visible (same rhythm as the party panel). */
const TURN_POLL_MS = 15_000;

/** A finished turn's notice in the bell (local to this device and campaign). */
export interface TurnNotification {
  campaignId: number;
  turnNo: number;
  /** When this device noticed the turn finished (ISO); null for notices recorded before 046. */
  at: string | null;
  read: boolean;
}

interface TurnContextType {
  // State
  /** Turn in progress of the current campaign (null while unknown or when the user can't see it). */
  turnNo: number | null;
  /** Entries of the turn in progress (chronological). */
  entries: TurnInfo[];
  /** Finished turns of the current campaign, unread then read, most recent first. */
  notifications: TurnNotification[];
  loading: boolean;
  error: string | null;
  // State management
  refresh: () => Promise<void>;
  /** Marks a finished turn's notification as read (it stays listed). */
  dismiss: (turnNo: number) => void;
  markRead: (turnNo: number) => void;
  /** "Marcar tudo como lido" for this campaign's turn notices (046). */
  markAllRead: () => void;
  clearError: () => void;
  // API
  /** Records the piece's action (044: replacing its previous one of the turn), optionally answering a chat entry. */
  act: (mapTokenId: number, description: string, replyToTurnId?: number | null) => Promise<TurnInfo>;
  /** Also reloads the pieces (the move may be undone). */
  reset: (mapTokenId: number) => Promise<TurnResetResultInfo>;
  /** Master: finishes the turn; without `force` it only lists who still has to act. */
  finish: (force: boolean) => Promise<TurnFinishResultInfo>;
  /** Entries of any turn of the current campaign (summary). */
  listTurn: (turnNo: number) => Promise<TurnInfo[]>;
}

const TurnContext = createContext<TurnContextType | undefined>(undefined);

type SeenRecords = Record<string, TurnSeen>;

const readSeen = (): SeenRecords => {
  try {
    const raw = localStorage.getItem(TURN_STORAGE_KEY);
    return raw ? (JSON.parse(raw) as SeenRecords) : {};
  } catch {
    return {};
  }
};

const writeSeen = (records: SeenRecords) => {
  try {
    localStorage.setItem(TURN_STORAGE_KEY, JSON.stringify(records));
  } catch {
    // Storage unavailable: notifications just don't survive a reload.
  }
};

export const TurnProvider = ({ children }: { children: ReactNode }) => {
  const { session } = useAuth();
  const { currentCampaign, isMaster } = useCampaign();
  const { myParticipations } = useCharacter();
  const { refresh: refreshMapTokens } = useMapToken();
  const { live } = useRealtime();
  const [turnNo, setTurnNo] = useState<number | null>(null);
  const [entries, setEntries] = useState<TurnInfo[]>([]);
  const [seen, setSeen] = useState<TurnSeen | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  /** Campaign whose turn is wanted; late responses for another campaign are dropped. */
  const campaignRef = useRef<number | null>(null);

  const campaignId = currentCampaign?.campaignId ?? null;
  /** Only the master and approved participants may read the turn (else the API answers 403). */
  const canRead = !!session && campaignId !== null && (isMaster || myParticipations.some(
    (p) => p.campaignId === campaignId && p.status === CAMPAIGN_CHARACTER_STATUS.approved));

  const track = useCallback((id: number, current: number) => {
    const records = readSeen();
    const next = trackTurn(records[id], current);
    if (next !== records[id]) writeSeen({ ...records, [id]: next });
    setSeen(next);
  }, []);

  const refresh = useCallback(async () => {
    campaignRef.current = canRead ? campaignId : null;
    if (!canRead || campaignId === null) {
      setTurnNo(null);
      setEntries([]);
      setSeen(null);
      return;
    }
    try {
      const state = await turnService.getState(campaignId);
      if (campaignRef.current !== campaignId) return;
      setTurnNo(state.turnNo);
      setEntries(state.entries);
      track(campaignId, state.turnNo);
    } catch {
      // 403 (lost access) or network: keep quiet; 401 is handled globally.
    }
  }, [canRead, campaignId, track]);

  useEffect(() => {
    setTurnNo(null);
    setEntries([]);
    void refresh();
  }, [refresh]);

  // Real-time table (017): the turn changes for everyone at once.
  useTableEvents((event) => {
    if (event.type === TABLE_EVENT.turnChanged || event.type === TABLE_EVENT.turnFinished || event.type === TABLE_EVENT.resync)
      void refresh();
  });

  // Without the real-time channel: every 15 s while the tab is visible, and right away when it becomes visible.
  useEffect(() => {
    if (!canRead || live) return;
    const tick = () => {
      if (document.visibilityState === 'visible') void refresh();
    };
    const timer = window.setInterval(tick, TURN_POLL_MS);
    document.addEventListener('visibilitychange', tick);
    return () => {
      window.clearInterval(timer);
      document.removeEventListener('visibilitychange', tick);
    };
  }, [canRead, live, refresh]);

  const run = useCallback(async <T,>(action: () => Promise<T>): Promise<T> => {
    try {
      setLoading(true);
      setError(null);
      return await action();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const requireCampaign = useCallback((): number => {
    if (campaignId === null) throw new Error('no current campaign');
    return campaignId;
  }, [campaignId]);

  const act = useCallback(async (mapTokenId: number, description: string, replyToTurnId: number | null = null) => {
    const result = await run(() => turnService.act(mapTokenId, description, replyToTurnId));
    await refresh();
    return result;
  }, [run, refresh]);

  const reset = useCallback(async (mapTokenId: number) => {
    const result = await run(() => turnService.reset(mapTokenId));
    await Promise.all([refresh(), refreshMapTokens()]);
    return result;
  }, [run, refresh, refreshMapTokens]);

  const finish = useCallback(async (force: boolean) => {
    const result = await run(() => turnService.finish(requireCampaign(), force));
    if (result.finished) await refresh();
    return result;
  }, [run, refresh, requireCampaign]);

  const listTurn = useCallback((no: number) => run(() => turnService.list(requireCampaign(), no)), [run, requireCampaign]);

  const update = useCallback((change: (record: TurnSeen) => TurnSeen) => {
    if (campaignId === null) return;
    const records = readSeen();
    const record = records[campaignId];
    if (!record) return;
    const next = change(record);
    if (next === record) return;
    writeSeen({ ...records, [campaignId]: next });
    setSeen(next);
  }, [campaignId]);

  const markRead = useCallback((no: number) => update((record) => markTurnRead(record, no)), [update]);
  const markAllRead = useCallback(() => update(markAllTurnsRead), [update]);

  const clearError = useCallback(() => setError(null), []);

  const notifications: TurnNotification[] = campaignId === null || seen === null ? [] : [
    ...seen.unread.map((no) => ({ campaignId, turnNo: no, at: seen.at?.[no] ?? null, read: false })),
    ...(seen.read ?? []).map((no) => ({ campaignId, turnNo: no, at: seen.at?.[no] ?? null, read: true })),
  ];

  const value: TurnContextType = {
    turnNo, entries, notifications, loading, error, refresh, dismiss: markRead, markRead, markAllRead, clearError, act, reset,
    finish, listTurn,
  };
  return <TurnContext.Provider value={value}>{children}</TurnContext.Provider>;
};

export default TurnContext;
