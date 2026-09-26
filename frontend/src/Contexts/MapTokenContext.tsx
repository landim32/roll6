import { createContext, useCallback, useEffect, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { mapTokenService } from '../Services/mapTokenService';
import { useCampaign } from '../hooks/useCampaign';
import { useCharacter } from '../hooks/useCharacter';
import { useMapEditor } from '../hooks/useMapEditor';
import type { CampaignCharacterInfo } from '../types/campaignCharacter';
import { MAP_TOKEN_TYPE } from '../types/mapToken';
import type { MapTokenInfo } from '../types/mapToken';
import type { TokenInfo } from '../types/token';

interface MapTokenContextType {
  /** Pieces of the campaign map open in the editor (empty for a model opened outside a campaign). */
  mapTokens: MapTokenInfo[];
  /** Only the master of the current campaign places, moves and changes pieces (011 FR-012). */
  canPlace: boolean;
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  /** New NPC piece from the hex menu. */
  addToken: (token: TokenInfo, x: number, y: number) => Promise<MapTokenInfo>;
  /** Places a party character; `tokenId` is saved on the character when it has none. */
  placeCharacter: (participation: CampaignCharacterInfo, x: number, y: number, tokenId?: number) => Promise<MapTokenInfo>;
  moveToken: (mapTokenId: number, x: number, y: number) => Promise<MapTokenInfo>;
  changeToken: (mapTokenId: number, tokenId: number) => Promise<MapTokenInfo>;
  /** Removes the piece from the map (the library token is kept). */
  deleteToken: (mapTokenId: number) => Promise<void>;
  clearError: () => void;
}

const MapTokenContext = createContext<MapTokenContextType | undefined>(undefined);

export const MapTokenProvider = ({ children }: { children: ReactNode }) => {
  const { draft } = useMapEditor();
  const { currentCampaign, isMaster } = useCampaign();
  const { refresh: refreshCharacters, refreshParty } = useCharacter();
  const [mapTokens, setMapTokens] = useState<MapTokenInfo[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  /** Map whose pieces are wanted; late responses for another map are dropped. */
  const mapIdRef = useRef<number | null>(null);

  const mapId = draft.mapId;
  const canPlace = isMaster && mapId !== null && draft.campaignId === currentCampaign?.campaignId;

  const refresh = useCallback(async () => {
    mapIdRef.current = mapId;
    if (mapId === null) {
      setMapTokens([]);
      return;
    }
    try {
      const tokens = await mapTokenService.listByMap(mapId);
      if (mapIdRef.current === mapId) setMapTokens(tokens);
    } catch (err) {
      // Not allowed (not a participant) or offline: no pieces; 401 is handled globally.
      if (mapIdRef.current === mapId) setMapTokens([]);
      setError(err instanceof Error ? err.message : 'Unknown error');
    }
  }, [mapId]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const run = useCallback(async <T,>(action: () => Promise<T>): Promise<T> => {
    try {
      setLoading(true);
      setError(null);
      const result = await action();
      await refresh();
      return result;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
      throw err;
    } finally {
      setLoading(false);
    }
  }, [refresh]);

  const requireMap = (): number => {
    if (mapId === null) throw new Error('no campaign map open');
    return mapId;
  };

  const addToken = useCallback((token: TokenInfo, x: number, y: number) => run(() => mapTokenService.create({
    mapId: requireMap(), tokenId: token.tokenId, name: token.name, tokenType: MAP_TOKEN_TYPE.npc,
    sheet: null, life: 0, energy: 0, status: null, move: 0, x, y, look: 0,
  })),
  // eslint-disable-next-line react-hooks/exhaustive-deps
  [run, mapId]);

  const placeCharacter = useCallback(async (participation: CampaignCharacterInfo, x: number, y: number, tokenId?: number) => {
    const result = await run(() => mapTokenService.placeCharacter({
      mapId: requireMap(), campaignCharacterId: participation.campaignCharacterId, tokenId: tokenId ?? null, x, y,
    }));
    // The chosen token became the character's own: reload what shows it.
    if (participation.characterTokenId === null) {
      void refreshParty();
      void refreshCharacters(true);
    }
    return result;
  },
  // eslint-disable-next-line react-hooks/exhaustive-deps
  [run, mapId, refreshParty, refreshCharacters]);

  const moveToken = useCallback((mapTokenId: number, x: number, y: number) =>
    run(() => mapTokenService.move(mapTokenId, { x, y })), [run]);

  const changeToken = useCallback((mapTokenId: number, tokenId: number) =>
    run(() => mapTokenService.changeToken(mapTokenId, { tokenId })), [run]);

  const deleteToken = useCallback((mapTokenId: number) =>
    run(() => mapTokenService.remove(mapTokenId)), [run]);

  const clearError = useCallback(() => setError(null), []);

  const value: MapTokenContextType = {
    mapTokens, canPlace, loading, error, refresh, addToken, placeCharacter, moveToken, changeToken, deleteToken, clearError,
  };
  return <MapTokenContext.Provider value={value}>{children}</MapTokenContext.Provider>;
};

export default MapTokenContext;
