import { createContext, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { campaignService } from '../Services/campaignService';
import { CAMPAIGN_STORAGE_KEY } from '../Services/apiHelpers';
import { parseTablePath } from '../lib/tableRoute';
import { useAuth } from '../hooks/useAuth';
import type { CampaignInfo, CampaignInsertInfo, CampaignTableInfo } from '../types/campaign';
import type { ListQuery, PagedList } from '../types/common';

interface CampaignContextType {
  // State
  currentCampaign: CampaignInfo | null;
  /** Campaigns the user masters or plays, with the map the table follows. */
  tableCampaigns: CampaignTableInfo[];
  /** The logged user is the master (owner) of the current campaign. */
  isMaster: boolean;
  loading: boolean;
  error: string | null;
  // API methods
  listCampaigns: (query: ListQuery) => Promise<PagedList<CampaignInfo>>;
  createCampaign: (data: CampaignInsertInfo) => Promise<CampaignInfo>;
  /** Campaign addressed by its URL slug. */
  getCampaignBySlug: (slug: string) => Promise<CampaignInfo>;
  /** Reloads the table combo. A failed call keeps the list already shown. */
  refreshTableCampaigns: () => Promise<void>;
  /**
   * The master's deliberate "Tornar atual" (048): the map becomes the one the players follow. It never opens the map
   * for the master. Throws the API error (the previous current map stays).
   */
  makeCurrentMap: (mapId: number) => Promise<CampaignInfo>;
  // State management
  selectCampaign: (campaign: CampaignInfo | null) => void;
  clearError: () => void;
}

const CampaignContext = createContext<CampaignContextType | undefined>(undefined);

export const CampaignProvider = ({ children }: { children: ReactNode }) => {
  const { session } = useAuth();
  const [currentCampaign, setCurrentCampaign] = useState<CampaignInfo | null>(null);
  const [tableCampaigns, setTableCampaigns] = useState<CampaignTableInfo[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const currentRef = useRef<CampaignInfo | null>(null);
  currentRef.current = currentCampaign;
  const sessionRef = useRef(session);
  sessionRef.current = session;

  const handleError = (err: unknown): never => {
    setError(err instanceof Error ? err.message : 'Unknown error');
    throw err;
  };

  const refreshTableCampaigns = useCallback(async () => {
    if (!sessionRef.current) {
      setTableCampaigns([]);
      return;
    }
    try {
      const list = await campaignService.listTable();
      if (sessionRef.current) setTableCampaigns(list);
    } catch {
      // A failed refresh keeps the list already shown.
    }
  }, []);

  const selectCampaign = useCallback((campaign: CampaignInfo | null) => {
    const previousMapId = currentRef.current?.currentMapId ?? null;
    currentRef.current = campaign;
    setCurrentCampaign(campaign);
    if (campaign) localStorage.setItem(CAMPAIGN_STORAGE_KEY, String(campaign.campaignId));
    else localStorage.removeItem(CAMPAIGN_STORAGE_KEY);
    if (campaign && previousMapId !== (campaign.currentMapId ?? null)) void refreshTableCampaigns();
  }, [refreshTableCampaigns]);

  const listCampaigns = useCallback(async (query: ListQuery): Promise<PagedList<CampaignInfo>> => {
    try {
      setError(null);
      return await campaignService.list(query);
    } catch (err) {
      return handleError(err);
    }
  }, []);

  const getCampaignBySlug = useCallback(async (slug: string): Promise<CampaignInfo> => {
    try {
      setError(null);
      return await campaignService.getBySlug(slug);
    } catch (err) {
      return handleError(err);
    }
  }, []);

  const createCampaign = useCallback(async (data: CampaignInsertInfo): Promise<CampaignInfo> => {
    try {
      setLoading(true);
      setError(null);
      const created = await campaignService.create(data);
      selectCampaign(created);
      await refreshTableCampaigns();
      return created;
    } catch (err) {
      return handleError(err);
    } finally {
      setLoading(false);
    }
  }, [selectCampaign, refreshTableCampaigns]);

  const clearError = useCallback(() => setError(null), []);

  // Restore the remembered campaign once logged in; forget it on logout.
  useEffect(() => {
    if (!session) {
      setCurrentCampaign(null);
      setTableCampaigns([]);
      return;
    }
    void refreshTableCampaigns();
    // A /campaign or /map address is resolved by useTableRoute; restoring here would race it.
    if (parseTablePath(window.location.pathname).kind !== 'root') return;
    const storedId = Number(localStorage.getItem(CAMPAIGN_STORAGE_KEY));
    if (!storedId) return;
    let cancelled = false;
    setLoading(true);
    campaignService.getById(storedId)
      .then((campaign) => { if (!cancelled) setCurrentCampaign(campaign); })
      .catch(() => { if (!cancelled) localStorage.removeItem(CAMPAIGN_STORAGE_KEY); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [session, refreshTableCampaigns]);

  const isMaster = !!currentCampaign && !!session && currentCampaign.userId === session.user.userId;

  const currentCampaignId = currentCampaign?.campaignId ?? null;
  const makeCurrentMap = useCallback(async (mapId: number): Promise<CampaignInfo> => {
    if (currentCampaignId === null) throw new Error('no campaign');
    const campaign = await campaignService.setCurrentMap(currentCampaignId, mapId);
    selectCampaign(campaign);
    return campaign;
  }, [currentCampaignId, selectCampaign]);

  const value = useMemo<CampaignContextType>(() => ({
    currentCampaign, tableCampaigns, isMaster, loading, error, listCampaigns, createCampaign, getCampaignBySlug,
    refreshTableCampaigns, makeCurrentMap, selectCampaign, clearError,
  }), [currentCampaign, tableCampaigns, isMaster, loading, error, listCampaigns, createCampaign, getCampaignBySlug, refreshTableCampaigns, makeCurrentMap, selectCampaign, clearError]);

  return <CampaignContext.Provider value={value}>{children}</CampaignContext.Provider>;
};

export default CampaignContext;
