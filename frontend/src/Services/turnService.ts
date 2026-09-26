import type { TurnFinishResultInfo, TurnInfo, TurnResetResultInfo, TurnStateInfo } from '../types/turn';
import { API_URL, getHeaders, handleApiResponse } from './apiHelpers';

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

  /** Records an action of the piece's character/NPC in the current turn. */
  async act(mapTokenId: number, description: string): Promise<TurnInfo> {
    const response = await fetch(`${API_URL}/api/turn/action`, {
      method: 'POST', headers: getHeaders(true), body: JSON.stringify({ mapTokenId, description }),
    });
    return this.handleResponse<TurnInfo>(response);
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
