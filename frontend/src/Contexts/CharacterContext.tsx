import { createContext, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { characterService } from '../Services/characterService';
import { campaignCharacterService } from '../Services/campaignCharacterService';
import { useAuth } from '../hooks/useAuth';
import { useCampaign } from '../hooks/useCampaign';
import {
  buildCharacterOptions, readStoredSelections, resolveSelection, writeStoredSelection,
} from '../lib/characterSelection';
import type { CharacterOption, CharacterSelection } from '../lib/characterSelection';
import type { CharacterInfo, CharacterInsertInfo, CharacterSearchInfo } from '../types/character';
import { CAMPAIGN_CHARACTER_STATUS } from '../types/campaignCharacter';
import type { CampaignCharacterInfo, CampaignCharacterVitalsInfo } from '../types/campaignCharacter';
import type { ListQuery, PagedList } from '../types/common';

/** Invites are polled at most this often (spec FR-020 / SC-003). */
const INVITES_POLL_MS = 60_000;
/** The party panel (and the user's own participations) refresh this often (spec FR-013 / SC-003). */
const PARTY_POLL_MS = 15_000;

/** Result of "Incluir Personagem": the access request may fail after the character was created. */
export interface CreateCharacterResult {
  character: CharacterInfo;
  participation: CampaignCharacterInfo | null;
  requestError: string | null;
}

interface CharacterContextType {
  // State
  myCharacters: CharacterInfo[];
  /** Participations of the user's characters in the current campaign. */
  myParticipations: CampaignCharacterInfo[];
  /** Combo options: GM (master only) + own approved characters. */
  options: CharacterOption[];
  currentSelection: CharacterSelection | null;
  currentCharacter: CharacterInfo | null;
  /** Pending invites of the user's characters (notifications). */
  invites: CampaignCharacterInfo[];
  /** Approved characters of the current campaign (party panel); empty when the user cannot see them. */
  party: CampaignCharacterInfo[];
  loading: boolean;
  error: string | null;
  // State management
  /** Reloads the user's characters and participations; `silent` skips the loading flag (polling). */
  refresh: (silent?: boolean) => Promise<void>;
  refreshParty: () => Promise<void>;
  select: (value: CharacterSelection) => void;
  clearError: () => void;
  // Character owner
  createCharacter: (data: CharacterInsertInfo) => Promise<CreateCharacterResult>;
  requestAccess: (characterId: number) => Promise<CampaignCharacterInfo>;
  refreshInvites: () => Promise<void>;
  acceptInvite: (campaignCharacterId: number) => Promise<CampaignCharacterInfo>;
  declineInvite: (campaignCharacterId: number) => Promise<CampaignCharacterInfo>;
  // Master of the current campaign
  listCampaignCharacters: () => Promise<CampaignCharacterInfo[]>;
  approve: (campaignCharacterId: number) => Promise<CampaignCharacterInfo>;
  deny: (campaignCharacterId: number) => Promise<CampaignCharacterInfo>;
  remove: (campaignCharacterId: number) => Promise<void>;
  invite: (characterId: number) => Promise<CampaignCharacterInfo>;
  searchCharacters: (query: ListQuery) => Promise<PagedList<CharacterSearchInfo>>;
  // Owner or master (party panel edit)
  getCharacter: (characterId: number) => Promise<CharacterInfo>;
  updateCharacter: (characterId: number, data: CharacterInsertInfo) => Promise<CharacterInfo>;
  updateVitals: (campaignCharacterId: number, data: CampaignCharacterVitalsInfo) => Promise<CampaignCharacterInfo>;
}

const requireCampaign = (campaignId: number | null): number => {
  if (campaignId === null) throw new Error('no campaign selected');
  return campaignId;
};

const CharacterContext = createContext<CharacterContextType | undefined>(undefined);

export const CharacterProvider = ({ children }: { children: ReactNode }) => {
  const { session } = useAuth();
  const { currentCampaign, isMaster } = useCampaign();
  const [myCharacters, setMyCharacters] = useState<CharacterInfo[]>([]);
  const [myParticipations, setMyParticipations] = useState<CampaignCharacterInfo[]>([]);
  /** Campaign the participations above were loaded for (they lag one render behind a switch). */
  const [loadedFor, setLoadedFor] = useState<number | null | undefined>(undefined);
  const [stored, setStored] = useState<CharacterSelection | null>(null);
  const [invites, setInvites] = useState<CampaignCharacterInfo[]>([]);
  const [party, setParty] = useState<CampaignCharacterInfo[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const campaignId = currentCampaign?.campaignId ?? null;
  /** Id of the latest refresh, so a slow answer for a previous campaign is discarded. */
  const refreshSeq = useRef(0);
  const partySeq = useRef(0);

  const handleError = (err: unknown): never => {
    setError(err instanceof Error ? err.message : 'Unknown error');
    throw err;
  };

  // ---------- loading ----------

  const refresh = useCallback(async (silent = false) => {
    if (!session) {
      setMyCharacters([]);
      setMyParticipations([]);
      setLoadedFor(undefined);
      return;
    }
    const seq = ++refreshSeq.current;
    try {
      if (!silent) {
        setLoading(true);
        setError(null);
      }
      const [characters, participations] = await Promise.all([
        characterService.listMine(),
        campaignId !== null ? campaignCharacterService.listMine(campaignId) : Promise.resolve([]),
      ]);
      if (seq !== refreshSeq.current) return;
      setMyCharacters(characters);
      setMyParticipations(participations);
      setLoadedFor(campaignId);
    } catch (err) {
      if (!silent) setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      if (!silent) setLoading(false);
    }
  }, [session, campaignId]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const refreshInvites = useCallback(async () => {
    if (!session) {
      setInvites([]);
      return;
    }
    try {
      setInvites(await campaignCharacterService.listInvites());
    } catch {
      // Background refresh: a failure keeps the last list (401 is handled globally).
    }
  }, [session]);

  // Invites on login and every minute while the tab is visible.
  useEffect(() => {
    void refreshInvites();
    if (!session) return;
    const timer = window.setInterval(() => {
      if (document.visibilityState === 'visible') void refreshInvites();
    }, INVITES_POLL_MS);
    return () => window.clearInterval(timer);
  }, [session, refreshInvites]);

  // ---------- party panel ----------

  const loaded = loadedFor === campaignId;
  /** Only the master and approved participants may list the campaign (else the API answers 403). */
  const canSeeParty = loaded && campaignId !== null
    && (isMaster || myParticipations.some((p) => p.status === CAMPAIGN_CHARACTER_STATUS.approved));

  const refreshParty = useCallback(async () => {
    const seq = ++partySeq.current;
    if (!session || !canSeeParty || campaignId === null) {
      setParty([]);
      return;
    }
    try {
      const members = await campaignCharacterService.listByCampaign(campaignId);
      if (seq !== partySeq.current) return;
      setParty(members.filter((m) => m.status === CAMPAIGN_CHARACTER_STATUS.approved));
    } catch {
      // 403 (lost access) or network: the panel just empties / keeps quiet; 401 is handled globally.
      if (seq === partySeq.current) setParty([]);
    }
  }, [session, canSeeParty, campaignId]);

  useEffect(() => {
    void refreshParty();
  }, [refreshParty]);

  // Every 15 s while the tab is visible, and right away when it becomes visible again.
  useEffect(() => {
    if (!session || campaignId === null) return;
    const tick = () => {
      if (document.visibilityState !== 'visible') return;
      void refresh(true);
      void refreshParty();
    };
    const timer = window.setInterval(tick, PARTY_POLL_MS);
    document.addEventListener('visibilitychange', tick);
    return () => {
      window.clearInterval(timer);
      document.removeEventListener('visibilitychange', tick);
    };
  }, [session, campaignId, refresh, refreshParty]);

  // ---------- selection ----------

  const options = useMemo(
    () => (loaded ? buildCharacterOptions({ isMaster, myCharacters, myParticipations }) : []),
    [loaded, isMaster, myCharacters, myParticipations],
  );

  // Restore the choice remembered for the campaign when it changes.
  useEffect(() => {
    setStored(campaignId !== null ? readStoredSelections()[campaignId] ?? null : null);
  }, [campaignId]);

  // Until the campaign's data arrives keep the remembered choice instead of falling back.
  const currentSelection = useMemo(
    () => (loaded ? resolveSelection(stored, options) : stored),
    [loaded, stored, options],
  );

  // Keep the remembered choice in sync with the resolved one (e.g. fallback after a removal).
  useEffect(() => {
    if (campaignId !== null && loaded) writeStoredSelection(campaignId, currentSelection);
  }, [campaignId, loaded, currentSelection]);

  const select = useCallback((value: CharacterSelection) => {
    setStored(value);
    if (campaignId !== null) writeStoredSelection(campaignId, value);
  }, [campaignId]);

  const currentCharacter = typeof currentSelection === 'number'
    ? myCharacters.find((c) => c.characterId === currentSelection) ?? null
    : null;

  // ---------- actions ----------

  /** Runs an action with loading/error handling, then reloads the user's data. */
  const run = useCallback(async <T,>(action: () => Promise<T>, reload = true): Promise<T> => {
    try {
      setLoading(true);
      setError(null);
      const result = await action();
      if (reload) {
        await refresh();
        void refreshParty();
      }
      return result;
    } catch (err) {
      return handleError(err);
    } finally {
      setLoading(false);
    }
  }, [refresh, refreshParty]);

  const requestAccess = useCallback((characterId: number) => run(() =>
    campaignCharacterService.requestAccess({ campaignId: requireCampaign(campaignId), characterId })),
  [run, campaignId]);

  const createCharacter = useCallback(async (data: CharacterInsertInfo): Promise<CreateCharacterResult> => {
    const result = await run(async () => {
      const character = await characterService.create(data);
      if (campaignId === null) return { character, participation: null, requestError: null };
      try {
        const participation = await campaignCharacterService.requestAccess({ campaignId, characterId: character.characterId });
        return { character, participation, requestError: null };
      } catch (err) {
        // The character stays created; the request can be retried in "Selecionar Personagem".
        return { character, participation: null, requestError: err instanceof Error ? err.message : String(err) };
      }
    });
    if (result.participation?.status === CAMPAIGN_CHARACTER_STATUS.approved) select(result.character.characterId);
    return result;
  }, [run, campaignId, select]);

  const acceptInvite = useCallback(async (id: number) => {
    const result = await run(() => campaignCharacterService.accept(id));
    await refreshInvites();
    return result;
  }, [run, refreshInvites]);

  const declineInvite = useCallback(async (id: number) => {
    const result = await run(() => campaignCharacterService.decline(id));
    await refreshInvites();
    return result;
  }, [run, refreshInvites]);

  const listCampaignCharacters = useCallback(() =>
    run(() => campaignCharacterService.listByCampaign(requireCampaign(campaignId)), false),
  [run, campaignId]);

  // Master actions may touch the master's own characters too, so the user's data is reloaded.
  const approve = useCallback((id: number) => run(() => campaignCharacterService.approve(id)), [run]);
  const deny = useCallback((id: number) => run(() => campaignCharacterService.deny(id)), [run]);
  const remove = useCallback((id: number) => run(() => campaignCharacterService.remove(id)), [run]);
  const invite = useCallback((characterId: number) => run(() =>
    campaignCharacterService.invite({ campaignId: requireCampaign(campaignId), characterId })),
  [run, campaignId]);

  const getCharacter = useCallback(async (characterId: number) => {
    try {
      setError(null);
      return await characterService.getById(characterId);
    } catch (err) {
      return handleError(err);
    }
  }, []);

  const updateCharacter = useCallback((characterId: number, data: CharacterInsertInfo) =>
    run(() => characterService.update(characterId, data)), [run]);

  const updateVitals = useCallback(async (campaignCharacterId: number, data: CampaignCharacterVitalsInfo) => {
    const result = await run(() => campaignCharacterService.updateVitals(campaignCharacterId, data), false);
    await refreshParty();
    return result;
  }, [run, refreshParty]);

  const searchCharacters = useCallback(async (query: ListQuery) => {
    try {
      setError(null);
      return await characterService.search(query);
    } catch (err) {
      return handleError(err);
    }
  }, []);

  const clearError = useCallback(() => setError(null), []);

  const value: CharacterContextType = {
    myCharacters, myParticipations, options, currentSelection, currentCharacter, invites, party, loading, error,
    refresh, refreshParty, select, clearError,
    createCharacter, requestAccess, refreshInvites, acceptInvite, declineInvite,
    listCampaignCharacters, approve, deny, remove, invite, searchCharacters,
    getCharacter, updateCharacter, updateVitals,
  };

  return <CharacterContext.Provider value={value}>{children}</CharacterContext.Provider>;
};

export default CharacterContext;
