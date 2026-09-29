import { createContext, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { HubConnectionState } from '@microsoft/signalr';
import type { HubConnection } from '@microsoft/signalr';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { realtimeService, TABLE_EVENT_METHOD } from '../Services/realtimeService';
import { useAuth } from '../hooks/useAuth';
import { useCampaign } from '../hooks/useCampaign';
import { REALTIME_STATUS, TABLE_EVENT } from '../types/realtime';
import type { RealtimeStatus, TableEvent } from '../types/realtime';
import type { CampaignInfo } from '../types/campaign';

/** After the automatic retries give up (or a join is refused), try again this often. */
const RETRY_MS = 30_000;

type TableEventHandler = (event: TableEvent) => void;

interface RealtimeContextType {
  /** State of the connection to the table hub. */
  status: RealtimeStatus;
  /**
   * True while connected **and** following the current campaign: its events arrive, so the contexts can stop
   * polling. False for users the hub refuses (not master nor approved) — they keep polling.
   */
  live: boolean;
  /** Receives the current campaign's events (and the local `resync`); returns the unsubscribe function. */
  subscribe: (handler: TableEventHandler) => () => void;
}

const RealtimeContext = createContext<RealtimeContextType | undefined>(undefined);

/**
 * Real-time table channel (017): connects with the session token, follows the current campaign and hands its
 * events to the other contexts. After every (re)join it emits `resync` so they reload what may have been missed.
 */
export const RealtimeProvider = ({ children }: { children: ReactNode }) => {
  const { session } = useAuth();
  const { t } = useTranslation();
  const { currentCampaign, selectCampaign, refreshTableCampaigns } = useCampaign();
  const [status, setStatus] = useState<RealtimeStatus>(REALTIME_STATUS.disconnected);
  const [joinedId, setJoinedId] = useState<number | null>(null);
  const connectionRef = useRef<HubConnection | null>(null);
  const handlersRef = useRef(new Set<TableEventHandler>());
  const campaignId = currentCampaign?.campaignId ?? null;
  /** Campaign wanted right now (read by the connection callbacks). */
  const wantedRef = useRef<number | null>(campaignId);
  wantedRef.current = campaignId;
  const joinedRef = useRef<number | null>(null);
  /** Latest campaign object (for the campaign events, which live above the other contexts). */
  const campaignRef = useRef(currentCampaign);
  campaignRef.current = currentCampaign;
  const selectRef = useRef(selectCampaign);
  selectRef.current = selectCampaign;
  const refreshRef = useRef(refreshTableCampaigns);
  refreshRef.current = refreshTableCampaigns;
  const tRef = useRef(t);
  tRef.current = t;

  /**
   * The campaign itself lives above this provider: its events are applied here. Renamed/opened → new data;
   * deleted → leave it; the master switched maps → new `currentMapId` (the map editor follows it).
   */
  const applyCampaignEvent = useCallback((event: TableEvent) => {
    const campaign = campaignRef.current;
    if (!campaign || campaign.campaignId !== event.campaignId) return;
    if (event.type === TABLE_EVENT.campaignChanged || event.type === TABLE_EVENT.mapCurrent || event.type === TABLE_EVENT.campaignDeleted)
      void refreshRef.current();
    if (event.type === TABLE_EVENT.campaignChanged && event.data)
      selectRef.current({ ...(event.data as CampaignInfo) });
    else if (event.type === TABLE_EVENT.campaignDeleted) {
      selectRef.current(null);
      toast.warning(tRef.current('realtime.campaignDeleted'));
    } else if (event.type === TABLE_EVENT.mapCurrent)
      selectRef.current({ ...campaign, currentMapId: event.mapId });
  }, []);

  const dispatch = useCallback((event: TableEvent) => {
    applyCampaignEvent(event);
    handlersRef.current.forEach((handler) => {
      try {
        handler(event);
      } catch {
        // One broken handler must not stop the others.
      }
    });
  }, [applyCampaignEvent]);

  const setJoined = (id: number | null) => {
    joinedRef.current = id;
    setJoinedId(id);
  };

  /** Follows the wanted campaign (or none) and asks everyone to resync after a successful join. */
  const syncCampaign = useCallback(async () => {
    const connection = connectionRef.current;
    if (!connection || connection.state !== HubConnectionState.Connected) return;
    const wanted = wantedRef.current;
    try {
      if (wanted === null) {
        if (joinedRef.current !== null) await realtimeService.leaveCampaign(connection);
        setJoined(null);
        return;
      }
      await realtimeService.joinCampaign(connection, wanted);
      if (wantedRef.current !== wanted) return;
      setJoined(wanted);
      dispatch({ type: TABLE_EVENT.resync, campaignId: wanted, mapId: null, actorUserId: 0, data: null });
    } catch {
      // Refused (not master nor approved) or dropped: stay on polling; retried below.
      setJoined(null);
    }
  }, [dispatch]);

  // One connection per session.
  useEffect(() => {
    if (!session) return;
    const connection = realtimeService.createConnection();
    connectionRef.current = connection;
    let stopped = false;
    let retry: number | undefined;

    connection.on(TABLE_EVENT_METHOD, (event: TableEvent) => {
      if (event.campaignId === joinedRef.current && event.campaignId === wantedRef.current) dispatch(event);
    });
    connection.onreconnecting(() => {
      setStatus(REALTIME_STATUS.reconnecting);
      setJoined(null);
    });
    connection.onreconnected(() => {
      setStatus(REALTIME_STATUS.connected);
      void syncCampaign();
    });

    const start = async () => {
      if (stopped) return;
      try {
        await connection.start();
        if (stopped) return;
        setStatus(REALTIME_STATUS.connected);
        await syncCampaign();
      } catch {
        if (stopped) return;
        setStatus(REALTIME_STATUS.disconnected);
        retry = window.setTimeout(() => { void start(); }, RETRY_MS);
      }
    };
    connection.onclose(() => {
      setJoined(null);
      if (stopped) return;
      setStatus(REALTIME_STATUS.disconnected);
      retry = window.setTimeout(() => { void start(); }, RETRY_MS);
    });

    void start();
    return () => {
      stopped = true;
      window.clearTimeout(retry);
      connectionRef.current = null;
      setJoined(null);
      setStatus(REALTIME_STATUS.disconnected);
      void connection.stop();
    };
  }, [session, dispatch, syncCampaign]);

  // Another campaign (or none): follow it.
  useEffect(() => {
    if (status === REALTIME_STATUS.connected) void syncCampaign();
  }, [campaignId, status, syncCampaign]);

  // Connected but not following the campaign (refused, e.g. access not approved yet): try again now and then.
  useEffect(() => {
    if (status !== REALTIME_STATUS.connected || campaignId === null || joinedId === campaignId) return;
    const timer = window.setInterval(() => { void syncCampaign(); }, RETRY_MS);
    return () => window.clearInterval(timer);
  }, [status, campaignId, joinedId, syncCampaign]);

  const subscribe = useCallback((handler: TableEventHandler) => {
    handlersRef.current.add(handler);
    return () => { handlersRef.current.delete(handler); };
  }, []);

  const live = status === REALTIME_STATUS.connected && campaignId !== null && joinedId === campaignId;

  const value = useMemo<RealtimeContextType>(() => ({ status, live, subscribe }), [status, live, subscribe]);
  return <RealtimeContext.Provider value={value}>{children}</RealtimeContext.Provider>;
};

export default RealtimeContext;
