import { createContext, useCallback, useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import { campaignService } from '../Services/campaignService';
import { CAMPAIGN_STORAGE_KEY } from '../Services/apiHelpers';
import { useAuth } from '../hooks/useAuth';
import type { CampaignInfo, CampaignInsertInfo } from '../types/campaign';
import type { ListQuery, PagedList } from '../types/common';

interface CampaignContextType {
  // State
  currentCampaign: CampaignInfo | null;
  /** The logged user is the master (owner) of the current campaign. */
  isMaster: boolean;
  loading: boolean;
  error: string | null;
  // API methods
  listCampaigns: (query: ListQuery) => Promise<PagedList<CampaignInfo>>;
  createCampaign: (data: CampaignInsertInfo) => Promise<CampaignInfo>;
  // State management
  selectCampaign: (campaign: CampaignInfo | null) => void;
  clearError: () => void;
}

const CampaignContext = createContext<CampaignContextType | undefined>(undefined);

export const CampaignProvider = ({ children }: { children: ReactNode }) => {
  const { session } = useAuth();
  const [currentCampaign, setCurrentCampaign] = useState<CampaignInfo | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleError = (err: unknown): never => {
    setError(err instanceof Error ? err.message : 'Unknown error');
    throw err;
  };

  const selectCampaign = useCallback((campaign: CampaignInfo | null) => {
    setCurrentCampaign(campaign);
    if (campaign) localStorage.setItem(CAMPAIGN_STORAGE_KEY, String(campaign.campaignId));
    else localStorage.removeItem(CAMPAIGN_STORAGE_KEY);
  }, []);

  const listCampaigns = useCallback(async (query: ListQuery): Promise<PagedList<CampaignInfo>> => {
    try {
      setError(null);
      return await campaignService.list(query);
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
      return created;
    } catch (err) {
      return handleError(err);
    } finally {
      setLoading(false);
    }
  }, [selectCampaign]);

  const clearError = useCallback(() => setError(null), []);

  // Restore the remembered campaign once logged in; forget it on logout.
  useEffect(() => {
    if (!session) {
      setCurrentCampaign(null);
      return;
    }
    const storedId = Number(localStorage.getItem(CAMPAIGN_STORAGE_KEY));
    if (!storedId) return;
    let cancelled = false;
    setLoading(true);
    campaignService.getById(storedId)
      .then((campaign) => { if (!cancelled) setCurrentCampaign(campaign); })
      .catch(() => { if (!cancelled) localStorage.removeItem(CAMPAIGN_STORAGE_KEY); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [session]);

  const isMaster = !!currentCampaign && !!session && currentCampaign.userId === session.user.userId;

  const value = useMemo<CampaignContextType>(() => ({
    currentCampaign, isMaster, loading, error, listCampaigns, createCampaign, selectCampaign, clearError,
  }), [currentCampaign, isMaster, loading, error, listCampaigns, createCampaign, selectCampaign, clearError]);

  return <CampaignContext.Provider value={value}>{children}</CampaignContext.Provider>;
};

export default CampaignContext;
