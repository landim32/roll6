import { createContext, useCallback, useEffect, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { turnService } from '../Services/turnService';
import { TURN_STORAGE_KEY } from '../Services/apiHelpers';
import { useAuth } from '../hooks/useAuth';
import { useCampaign } from '../hooks/useCampaign';
import { useCharacter } from '../hooks/useCharacter';
import { useMapToken } from '../hooks/useMapToken';
import { trackTurn } from '../lib/turnStatus';
import type { TurnSeen } from '../lib/turnStatus';
import { CAMPAIGN_CHARACTER_STATUS } from '../types/campaignCharacter';
import type { TurnFinishResultInfo, TurnInfo, TurnResetResultInfo } from '../types/turn';

/** The turn is polled this often while the tab is visible (same rhythm as the party panel). */
const TURN_POLL_MS = 15_000;

/** A finished turn whose summary the user hasn't opened yet. */
export interface TurnNotification {
  campaignId: number;
  turnNo: number;
}

interface TurnContextType {
  // State
  /** Turn in progress of the current campaign (null while unknown or when the user can't see it). */
  turnNo: number | null;
  /** Entries of the turn in progress (chronological). */
  entries: TurnInfo[];
  /** Finished turns of the current campaign not read yet, most recent first. */
  notifications: TurnNotification[];
  loading: boolean;
  error: string | null;
  // State management
  refresh: () => Promise<void>;
  /** Marks a finished turn's notification as read. */
  dismiss: (turnNo: number) => void;
  clearError: () => void;
  // API
  act: (mapTokenId: number, description: string) => Promise<TurnInfo>;
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
  const [turnNo, setTurnNo] = useState<number | null>(null);
  const [entries, setEntries] = useState<TurnInfo[]>([]);
  const [unread, setUnread] = useState<number[]>([]);
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
    setUnread(next.unread);
  }, []);

  const refresh = useCallback(async () => {
    campaignRef.current = canRead ? campaignId : null;
    if (!canRead || campaignId === null) {
      setTurnNo(null);
      setEntries([]);
      setUnread([]);
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

  // Every 15 s while the tab is visible, and right away when it becomes visible again.
  useEffect(() => {
    if (!canRead) return;
    const tick = () => {
      if (document.visibilityState === 'visible') void refresh();
    };
    const timer = window.setInterval(tick, TURN_POLL_MS);
    document.addEventListener('visibilitychange', tick);
    return () => {
      window.clearInterval(timer);
      document.removeEventListener('visibilitychange', tick);
    };
  }, [canRead, refresh]);

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

  const act = useCallback(async (mapTokenId: number, description: string) => {
    const result = await run(() => turnService.act(mapTokenId, description));
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

  const dismiss = useCallback((no: number) => {
    if (campaignId === null) return;
    const records = readSeen();
    const seen = records[campaignId];
    if (!seen) return;
    const next = { ...seen, unread: seen.unread.filter((n) => n !== no) };
    writeSeen({ ...records, [campaignId]: next });
    setUnread(next.unread);
  }, [campaignId]);

  const clearError = useCallback(() => setError(null), []);

  const notifications: TurnNotification[] = campaignId === null ? [] : unread.map((no) => ({ campaignId, turnNo: no }));

  const value: TurnContextType = {
    turnNo, entries, notifications, loading, error, refresh, dismiss, clearError, act, reset, finish, listTurn,
  };
  return <TurnContext.Provider value={value}>{children}</TurnContext.Provider>;
};

export default TurnContext;
