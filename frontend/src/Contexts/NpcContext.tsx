import { createContext, useCallback, useEffect, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { campaignNpcService } from '../Services/campaignNpcService';
import { mapNpcService } from '../Services/mapNpcService';
import { npcService } from '../Services/npcService';
import { useCampaign } from '../hooks/useCampaign';
import { useMapEditor } from '../hooks/useMapEditor';
import { useMapToken } from '../hooks/useMapToken';
import type { ListQuery, PagedList } from '../types/common';
import type { CampaignNpcInfo, MapNpcInfo, NpcInfo, NpcInsertInfo } from '../types/npc';

interface NpcContextType {
  // State
  /** NPCs of the current campaign (empty unless the user is its master). */
  campaignNpcs: CampaignNpcInfo[];
  loading: boolean;
  error: string | null;
  // State management
  refreshCampaignNpcs: () => Promise<void>;
  clearError: () => void;
  // NPC library (owner)
  searchMyNpcs: (query: ListQuery) => Promise<PagedList<NpcInfo>>;
  getNpc: (npcId: number) => Promise<NpcInfo>;
  createNpc: (data: NpcInsertInfo) => Promise<NpcInfo>;
  updateNpc: (npcId: number, data: NpcInsertInfo) => Promise<NpcInfo>;
  // Current campaign (master)
  addToCampaign: (npcId: number) => Promise<CampaignNpcInfo>;
  /** Also removes the NPC's pieces from the campaign's maps. */
  removeFromCampaign: (campaignNpcId: number) => Promise<void>;
  /** New occurrence (and piece) on the open campaign map. */
  placeOnMap: (npcId: number, x: number, y: number) => Promise<MapNpcInfo>;
}

const NpcContext = createContext<NpcContextType | undefined>(undefined);

export const NpcProvider = ({ children }: { children: ReactNode }) => {
  const { currentCampaign, isMaster } = useCampaign();
  const { draft } = useMapEditor();
  const { refresh: refreshMapTokens } = useMapToken();
  const [campaignNpcs, setCampaignNpcs] = useState<CampaignNpcInfo[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  /** Campaign whose NPCs are wanted; late responses for another campaign are dropped. */
  const campaignRef = useRef<number | null>(null);

  const campaignId = isMaster ? currentCampaign?.campaignId ?? null : null;

  const handleError = (err: unknown): never => {
    setError(err instanceof Error ? err.message : 'Unknown error');
    throw err;
  };

  const refreshCampaignNpcs = useCallback(async () => {
    campaignRef.current = campaignId;
    if (campaignId === null) {
      setCampaignNpcs([]);
      return;
    }
    try {
      const list = await campaignNpcService.listByCampaign(campaignId);
      if (campaignRef.current === campaignId) setCampaignNpcs(list);
    } catch (err) {
      if (campaignRef.current === campaignId) setCampaignNpcs([]);
      setError(err instanceof Error ? err.message : 'Unknown error');
    }
  }, [campaignId]);

  useEffect(() => {
    void refreshCampaignNpcs();
  }, [refreshCampaignNpcs]);

  const run = useCallback(async <T,>(action: () => Promise<T>): Promise<T> => {
    try {
      setLoading(true);
      setError(null);
      return await action();
    } catch (err) {
      return handleError(err);
    } finally {
      setLoading(false);
    }
  }, []);

  const requireCampaign = (): number => {
    if (campaignId === null) throw new Error('no campaign mastered');
    return campaignId;
  };

  const searchMyNpcs = useCallback((query: ListQuery) => run(() => npcService.list(query)), [run]);
  const getNpc = useCallback((npcId: number) => run(() => npcService.getById(npcId)), [run]);
  const createNpc = useCallback((data: NpcInsertInfo) => run(() => npcService.create(data)), [run]);

  const updateNpc = useCallback(async (npcId: number, data: NpcInsertInfo) => {
    const result = await run(() => npcService.update(npcId, data));
    await refreshCampaignNpcs();
    return result;
  }, [run, refreshCampaignNpcs]);

  const addToCampaign = useCallback(async (npcId: number) => {
    const result = await run(() => campaignNpcService.add({ campaignId: requireCampaign(), npcId }));
    await refreshCampaignNpcs();
    return result;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [run, refreshCampaignNpcs, campaignId]);

  const removeFromCampaign = useCallback(async (campaignNpcId: number) => {
    await run(() => campaignNpcService.remove(campaignNpcId));
    await refreshCampaignNpcs();
    await refreshMapTokens();
  }, [run, refreshCampaignNpcs, refreshMapTokens]);

  const placeOnMap = useCallback(async (npcId: number, x: number, y: number) => {
    const mapId = draft.mapId;
    if (mapId === null) throw new Error('no campaign map open');
    const result = await run(() => mapNpcService.create({ mapId, npcId, x, y, look: 0 }));
    await refreshMapTokens();
    return result;
  }, [run, draft.mapId, refreshMapTokens]);

  const clearError = useCallback(() => setError(null), []);

  const value: NpcContextType = {
    campaignNpcs, loading, error, refreshCampaignNpcs, clearError,
    searchMyNpcs, getNpc, createNpc, updateNpc, addToCampaign, removeFromCampaign, placeOnMap,
  };
  return <NpcContext.Provider value={value}>{children}</NpcContext.Provider>;
};

export default NpcContext;
