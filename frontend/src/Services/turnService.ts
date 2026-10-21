import type { WhisperPayload } from '../lib/whisper';
import type {
  ActionTargetWrite, TurnFinishResultInfo, TurnInfo, TurnNarrationInfo, TurnRepeatResultInfo, TurnResetResultInfo, TurnStateInfo,
} from '../types/turn';
import { API_URL, getHeaders, handleApiResponse } from './apiHelpers';
import type { ActionTarget } from '../lib/chatComposer';

interface TurnServiceConfig {
  onUnauthorized?: () => void;
}

/** Turn Service — campaign turns (016): state, actions, reset and finishing. */
class TurnService {
  private config: TurnServiceConfig;

  constructor(config: TurnServiceConfig = {}) {
    this.config = config;
  }

  private async handleResponse<T>(response: Response): Promise<T> {
    return handleApiResponse<T>(response, this.config.onUnauthorized);
  }

  /** Current turn of the campaign and its entries (master or approved participants). */
  async getState(campaignId: number): Promise<TurnStateInfo> {
    const response = await fetch(`${API_URL}/api/campaign/${campaignId}/turn`, { headers: getHeaders(true) });
    return this.handleResponse<TurnStateInfo>(response);
  }

  /** Entries of any turn of the campaign (turn summary). */
  async list(campaignId: number, turnNo: number): Promise<TurnInfo[]> {
    const response = await fetch(`${API_URL}/api/campaign/${campaignId}/turn/${turnNo}`, { headers: getHeaders(true) });
    return this.handleResponse<TurnInfo[]>(response);
  }

  /** Narration of a turn, or the latest finished turn that has one (029). 204 → null. */
  async narration(campaignId: number, turnNo?: number): Promise<TurnNarrationInfo | null> {
    const query = turnNo === undefined ? '' : `?turnNo=${turnNo}`;
    const response = await fetch(`${API_URL}/api/campaign/${campaignId}/turn/narration${query}`, { headers: getHeaders(true) });
    return this.handleResponse<TurnNarrationInfo | null>(response);
  }

  /** Records an action of the piece's character/NPC in the current turn. */
  /** 080: the action names its piece or, for a character without one, the campaign and the character. */
  /** 098: `actionTarget` ("Agir sobre…") is the hex the action is about, only with a piece as the actor. */
  async act(target: ActionTarget, description: string, replyToTurnId: number | null = null, whisper: WhisperPayload = {},
    actionTarget: ActionTargetWrite | null = null): Promise<TurnInfo> {
    const response = await fetch(`${API_URL}/api/turn/action`, {
      method: 'POST', headers: getHeaders(true),
      body: JSON.stringify({ ...target, description, replyToTurnId, ...whisper, ...(actionTarget ? { target: actionTarget } : {}) }),
    });
    return this.handleResponse<TurnInfo>(response);
  }

  /** "Ação repetida" (099): sets, replaces or (null/empty) removes the actor's standing order. */
  async setRepeated(target: ActionTarget, description: string | null): Promise<TurnRepeatResultInfo> {
    const response = await fetch(`${API_URL}/api/turn/repeated-action`, {
      method: 'PUT', headers: getHeaders(true), body: JSON.stringify({ ...target, description }),
    });
    return this.handleResponse<TurnRepeatResultInfo>(response);
  }

  /** Deletes the piece's entries of the current turn and undoes its move. */
  async reset(mapTokenId: number): Promise<TurnResetResultInfo> {
    const response = await fetch(`${API_URL}/api/turn/reset`, {
      method: 'POST', headers: getHeaders(true), body: JSON.stringify({ mapTokenId }),
    });
    return this.handleResponse<TurnResetResultInfo>(response);
  }

  /** Master: finishes the turn; without `force` it only lists who still has to act. */
  async finish(campaignId: number, force: boolean): Promise<TurnFinishResultInfo> {
    const response = await fetch(`${API_URL}/api/campaign/${campaignId}/turn/finish`, {
      method: 'POST', headers: getHeaders(true), body: JSON.stringify({ force }),
    });
    return this.handleResponse<TurnFinishResultInfo>(response);
  }
}

export const turnService = new TurnService();
export default TurnService;
