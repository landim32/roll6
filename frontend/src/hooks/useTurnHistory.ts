import { useCallback, useEffect, useRef, useState } from 'react';
import { useCampaign } from './useCampaign';
import { useTurn } from './useTurn';
import { turnService } from '../Services/turnService';
import { mergeTurnPages, newTurnsCount } from '../lib/turnHistory';
import type { TurnHistoryItemInfo } from '../types/turn';

const PAGE_SIZE = 5;

export interface TurnHistoryState {
  /** Finished turns, newest first. */
  items: TurnHistoryItemInfo[];
  loading: boolean;
  error: string | null;
  /** Turn 1 was reached. */
  done: boolean;
  loadMore: () => void;
  retry: () => void;
  /** Increases whenever newer turns are put at the top (the list keeps the reading position). */
  prependedAt: number;
}

/**
 * Finished turns of the current campaign for the turn console (028): first page on open/campaign change, older pages
 * on demand, and the newly finished turns put at the top whenever the turn in progress advances — `TurnContext`
 * follows `turn.finished` from the real-time channel, or its periodic check when offline.
 */
export const useTurnHistory = (enabled: boolean): TurnHistoryState => {
  const { currentCampaign } = useCampaign();
  const { turnNo } = useTurn();
  const campaignId = currentCampaign?.campaignId ?? null;
  const active = enabled && campaignId !== null && turnNo !== null;

  const [items, setItems] = useState<TurnHistoryItemInfo[]>([]);
  const [nextBefore, setNextBefore] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [prependedAt, setPrependedAt] = useState(0);
  const seq = useRef(0);
  const loaded = useRef<number | null>(null);

  const fetchPage = useCallback(async (before: number | undefined, reset: boolean) => {
    if (campaignId === null) return;
    const mine = ++seq.current;
    setLoading(true);
    setError(null);
    try {
      const page = await turnService.history(campaignId, before, PAGE_SIZE);
      if (mine !== seq.current) return;
      setItems((prev) => mergeTurnPages(reset ? [] : prev, page.items));
      setNextBefore(page.nextBefore);
      setDone(page.nextBefore === null);
      loaded.current = page.currentTurn;
    } catch (err) {
      if (mine === seq.current) setError(err instanceof Error ? err.message : String(err));
    } finally {
      if (mine === seq.current) setLoading(false);
    }
  }, [campaignId]);

  // First page when opened or when the campaign changes.
  useEffect(() => {
    setItems([]);
    setNextBefore(null);
    setDone(false);
    loaded.current = null;
    if (active) void fetchPage(undefined, true);
  }, [active, campaignId, fetchPage]);

  // Turns finished meanwhile go to the top.
  useEffect(() => {
    if (!active || turnNo === null || campaignId === null || loaded.current === null || turnNo <= loaded.current) return;
    const newest = items.length > 0 ? items[0].turnNo : null;
    const count = newTurnsCount(newest, turnNo);
    loaded.current = turnNo;
    if (count === 0) return;
    turnService.history(campaignId, turnNo, count)
      .then((page) => {
        setItems((prev) => mergeTurnPages(prev, page.items));
        setPrependedAt((n) => n + 1);
      })
      .catch(() => { /* the next check or a reopen brings them */ });
  }, [active, turnNo, campaignId, items]);

  const loadMore = useCallback(() => {
    if (!active || loading || done || error || nextBefore === null) return;
    void fetchPage(nextBefore, false);
  }, [active, loading, done, error, nextBefore, fetchPage]);

  const retry = useCallback(() => {
    if (!active) return;
    void fetchPage(items.length > 0 ? nextBefore ?? undefined : undefined, items.length === 0);
  }, [active, fetchPage, items.length, nextBefore]);

  return { items, loading, error, done, loadMore, retry, prependedAt };
};

export default useTurnHistory;
